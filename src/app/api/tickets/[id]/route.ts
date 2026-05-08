import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { tickets, profiles, ticketComments, ticketAudit } from '@/lib/schema'
import { eq, asc, desc, and, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const creators  = alias(profiles, 'creators')
  const assignees = alias(profiles, 'assignees')

  const [row] = await db
    .select({
      ticket:   tickets,
      creator:  { fullName: creators.fullName, email: creators.email },
      assignee: { fullName: assignees.fullName, email: assignees.email },
    })
    .from(tickets)
    .leftJoin(creators,  eq(tickets.createdBy,  creators.id))
    .leftJoin(assignees, eq(tickets.assignedTo, assignees.id))
    .where(and(eq(tickets.id, id), eq(tickets.organizationId, orgId)))

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!isStaff && row.ticket.createdBy !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const commentAuthors = alias(profiles, 'comment_authors')
  const commentRows = await db
    .select({
      id: ticketComments.id,
      body: ticketComments.body,
      isInternal: ticketComments.isInternal,
      createdAt: ticketComments.createdAt,
      author: { fullName: commentAuthors.fullName, email: commentAuthors.email },
    })
    .from(ticketComments)
    .leftJoin(commentAuthors, eq(ticketComments.authorId, commentAuthors.id))
    .where(
      isStaff
        ? eq(ticketComments.ticketId, id)
        : and(eq(ticketComments.ticketId, id), eq(ticketComments.isInternal, false))
    )
    .orderBy(asc(ticketComments.createdAt))

  const auditActors = alias(profiles, 'audit_actors')
  const auditRows = await db
    .select({
      id: ticketAudit.id,
      action: ticketAudit.action,
      changes: ticketAudit.changes,
      createdAt: ticketAudit.createdAt,
      actor: { fullName: auditActors.fullName, email: auditActors.email },
    })
    .from(ticketAudit)
    .leftJoin(auditActors, eq(ticketAudit.userId, auditActors.id))
    .where(eq(ticketAudit.ticketId, id))
    .orderBy(desc(ticketAudit.createdAt))

  const techRows = isStaff
    ? await db
        .select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email })
        .from(profiles)
        .where(inArray(profiles.role, ['admin', 'technician']))
    : []

  return NextResponse.json({
    ticket:      row.ticket,
    creator:     row.creator,
    assignee:    row.assignee,
    comments:    commentRows,
    audit:       auditRows,
    technicians: techRows,
    profile:     { id: profile!.id, role: profile!.role, fullName: profile!.fullName, email: profile!.email },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const [ticket] = await db.select().from(tickets)
    .where(and(eq(tickets.id, id), eq(tickets.organizationId, orgId)))
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isStaff && ticket.createdBy !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { _audit, ...fields } = body

  if ('assignedTo' in fields && fields.assignedTo === '') fields.assignedTo = null
  if (fields.status === 'resolved') fields.resolvedAt = new Date()
  else if (fields.status && fields.status !== 'resolved') fields.resolvedAt = null

  await db.update(tickets).set(fields).where(eq(tickets.id, id))

  if (_audit) {
    await db.insert(ticketAudit).values({
      ticketId: id,
      userId,
      action: 'updated',
      changes: { [_audit.field]: { from: _audit.from, to: _audit.to } },
    })
  }

  return NextResponse.json({ ok: true })
}
