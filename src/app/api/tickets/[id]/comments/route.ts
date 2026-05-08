import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { tickets, profiles, ticketComments } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const [ticket] = await db
    .select({ createdBy: tickets.createdBy })
    .from(tickets)
    .where(and(eq(tickets.id, id), eq(tickets.organizationId, orgId)))
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isStaff && ticket.createdBy !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { body, isInternal } = await request.json()
  const internal = isStaff ? Boolean(isInternal) : false

  const commentAuthors = alias(profiles, 'comment_authors')
  const [comment] = await db
    .insert(ticketComments)
    .values({ ticketId: id, authorId: userId, body, isInternal: internal })
    .returning()

  const [withAuthor] = await db
    .select({
      id: ticketComments.id,
      body: ticketComments.body,
      isInternal: ticketComments.isInternal,
      createdAt: ticketComments.createdAt,
      author: { fullName: commentAuthors.fullName, email: commentAuthors.email },
    })
    .from(ticketComments)
    .leftJoin(commentAuthors, eq(ticketComments.authorId, commentAuthors.id))
    .where(eq(ticketComments.id, comment.id))

  return NextResponse.json(withAuthor, { status: 201 })
}
