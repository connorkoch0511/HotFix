import { NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

const VALID_ROLES: Role[] = ['admin', 'technician', 'end_user']

export async function PATCH(request: Request) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can change roles
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user_id, role } = await request.json()
  if (!user_id || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Prevent admin from changing their own role
  if (user_id === user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('profiles').update({ role }).eq('id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
