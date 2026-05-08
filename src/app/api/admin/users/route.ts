import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/backend'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/schema'
import { eq, asc, inArray } from 'drizzle-orm'
import type { Role } from '@/lib/types'

const VALID_ROLES: Role[] = ['admin', 'technician', 'end_user']

async function requireAdmin(userId: string) {
  const profile = await getDb().query.profiles.findFirst({ where: eq(profiles.id, userId) })
  return profile?.role === 'admin' ? profile : null
}

async function getOrgMemberIds(orgId: string): Promise<string[]> {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
  const { data } = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 500,
  })
  return data.map(m => m.publicUserData?.userId).filter((id): id is string => !!id)
}

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const memberIds = await getOrgMemberIds(orgId)
  if (!memberIds.length) return NextResponse.json([])

  const users = await getDb()
    .select()
    .from(profiles)
    .where(inArray(profiles.id, memberIds))
    .orderBy(asc(profiles.createdAt))

  return NextResponse.json(users)
}

export async function PATCH(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, role } = await request.json()
  if (!user_id || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (user_id === userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const memberIds = await getOrgMemberIds(orgId)
  if (!memberIds.includes(user_id)) {
    return NextResponse.json({ error: 'User not in organization' }, { status: 403 })
  }

  await getDb().update(profiles).set({ role }).where(eq(profiles.id, user_id))
  return NextResponse.json({ ok: true })
}
