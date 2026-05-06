import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/schema'
import { eq, asc } from 'drizzle-orm'
import type { Role } from '@/lib/types'

const VALID_ROLES: Role[] = ['admin', 'technician', 'end_user']

async function requireAdmin(userId: string) {
  const profile = await getDb().query.profiles.findFirst({ where: eq(profiles.id, userId) })
  return profile?.role === 'admin' ? profile : null
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await getDb().select().from(profiles).orderBy(asc(profiles.createdAt))
  return NextResponse.json(users)
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, role } = await request.json()
  if (!user_id || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (user_id === userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  await getDb().update(profiles).set({ role }).where(eq(profiles.id, user_id))
  return NextResponse.json({ ok: true })
}
