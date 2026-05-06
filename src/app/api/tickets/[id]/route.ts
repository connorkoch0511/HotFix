import { NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { _audit, ...fields } = body

  // Resolve assigned_to: empty string → null
  if ('assigned_to' in fields && fields.assigned_to === '') {
    fields.assigned_to = null
  }

  // Set resolved_at when status transitions to resolved
  if (fields.status === 'resolved') {
    fields.resolved_at = new Date().toISOString()
  } else if (fields.status && fields.status !== 'resolved') {
    fields.resolved_at = null
  }

  const { error } = await supabase
    .from('tickets')
    .update(fields)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Write audit entry via service role (bypasses RLS)
  if (_audit) {
    const service = createServiceClient()
    await service.from('ticket_audit').insert({
      ticket_id: id,
      user_id: user.id,
      action: 'updated',
      changes: { [_audit.field]: { from: _audit.from, to: _audit.to } },
    })
  }

  return NextResponse.json({ ok: true })
}
