import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { tickets, profiles, ticketAudit } from '@/lib/schema'
import { eq, desc, and } from 'drizzle-orm'
import type { Category, Priority } from '@/lib/types'

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const conditions = [eq(tickets.organizationId, orgId)]
  if (!isStaff) conditions.push(eq(tickets.createdBy, userId))

  const rows = await db
    .select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, category, priority } = await request.json() as {
    title: string; description: string; category: Category; priority: Priority
  }

  const db = getDb()
  const [ticket] = await db
    .insert(tickets)
    .values({ organizationId: orgId, title, description, category, priority, createdBy: userId })
    .returning()

  await db.insert(ticketAudit).values({
    ticketId: ticket.id,
    userId,
    action: 'created',
    changes: {},
  })

  return NextResponse.json({ id: ticket.id }, { status: 201 })
}
