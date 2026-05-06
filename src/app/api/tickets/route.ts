import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  let query = supabase.from('tickets').select('*').order('created_at', { ascending: false })
  if (!isStaff) query = query.eq('created_by', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
