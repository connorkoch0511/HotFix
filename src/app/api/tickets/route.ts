import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { tickets, profiles, ticketAudit } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import type { Category, Priority } from '@/lib/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const rows = await db
    .select()
    .from(tickets)
    .where(isStaff ? undefined : eq(tickets.createdBy, userId))
    .orderBy(desc(tickets.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, category, priority } = await request.json() as {
    title: string; description: string; category: Category; priority: Priority
  }

  const db = getDb()
  const [ticket] = await db
    .insert(tickets)
    .values({ title, description, category, priority, createdBy: userId })
    .returning()

  await db.insert(ticketAudit).values({
    ticketId: ticket.id,
    userId,
    action: 'created',
    changes: {},
  })

  return NextResponse.json({ id: ticket.id }, { status: 201 })
}
