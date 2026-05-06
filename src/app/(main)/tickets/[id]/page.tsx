'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import type { Ticket, Comment, AuditEntry, Profile, Status, Priority } from '@/lib/types'
import { ArrowLeft, Lock, Send, Clock } from 'lucide-react'

const STATUSES: Status[]   = ['open', 'in_progress', 'resolved', 'closed']
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [ticket, setTicket]     = useState<Ticket | null>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [technicians, setTechs] = useState<Profile[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [audit, setAudit]       = useState<AuditEntry[]>([])
  const [tab, setTab]           = useState<'comments' | 'audit'>('comments')
  const [body, setBody]         = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [posting, setPosting]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const load = useCallback(async () => {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/sign-in'); return }

    const [profileRes, ticketRes, commentsRes, auditRes, techsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('tickets').select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, full_name, email, role, department, created_at),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, role, department, created_at)
      `).eq('id', id).single(),
      supabase.from('ticket_comments').select(`*, author:profiles!ticket_comments_author_id_fkey(full_name, email)`).eq('ticket_id', id).order('created_at'),
      supabase.from('ticket_audit').select(`*, user:profiles!ticket_audit_user_id_fkey(full_name, email)`).eq('ticket_id', id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').in('role', ['admin', 'technician']),
    ])

    setProfile(profileRes.data as Profile)
    setTicket(ticketRes.data as Ticket)
    setComments((commentsRes.data ?? []) as Comment[])
    setAudit((auditRes.data ?? []) as AuditEntry[])
    setTechs((techsRes.data ?? []) as Profile[])
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  const updateField = async (field: string, value: string) => {
    if (!ticket) return
    setSaving(true)
    const old = (ticket as unknown as Record<string, unknown>)[field]
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value, _audit: { field, from: old, to: value } }),
    })
    setTicket(prev => prev ? { ...prev, [field]: value } as Ticket : prev)
    setSaving(false)
    // Refresh audit trail
    const supabase = getSupabaseClient()
    const { data } = await supabase.from('ticket_audit').select(`*, user:profiles!ticket_audit_user_id_fkey(full_name, email)`).eq('ticket_id', id).order('created_at', { ascending: false })
    setAudit((data ?? []) as AuditEntry[])
  }

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() || !profile) return
    setPosting(true)
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('ticket_comments')
      .insert({ ticket_id: id, author_id: profile.id, body: body.trim(), is_internal: isInternal })
      .select('*, author:profiles!ticket_comments_author_id_fkey(full_name, email)')
      .single()
    if (data) setComments(prev => [...prev, data as Comment])
    setBody('')
    setPosting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Ticket not found.</p>
        <Link href="/tickets" className="text-red-400 hover:text-red-300 text-sm mt-2 inline-block">← Back to tickets</Link>
      </div>
    )
  }

  const creator = ticket.creator as Profile | undefined
  const assignee = ticket.assignee as Profile | undefined

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tickets" className="text-gray-400 hover:text-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-100 truncate">{ticket.title}</h1>
        {saving && <span className="text-xs text-gray-500 ml-auto">Saving…</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Description</h2>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>

          {/* Comments / Audit tabs */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex border-b border-gray-800">
              {(['comments', 'audit'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === t
                      ? 'text-gray-100 border-b-2 border-red-600'
                      : 'text-gray-400 hover:text-gray-100'
                  }`}
                >
                  {t === 'comments' ? `Comments (${comments.length})` : `Audit Trail (${audit.length})`}
                </button>
              ))}
            </div>

            {tab === 'comments' && (
              <div>
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No comments yet.</p>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {comments.map(c => {
                      const author = c.author as { full_name: string; email: string } | undefined
                      return (
                        <div key={c.id} className={`p-5 ${c.is_internal ? 'bg-yellow-950/10 border-l-2 border-yellow-700' : ''}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-200">
                              {author?.full_name || author?.email || 'Unknown'}
                            </span>
                            {c.is_internal && (
                              <span className="flex items-center gap-1 text-xs text-yellow-500">
                                <Lock className="h-3 w-3" /> Internal
                              </span>
                            )}
                            <span className="text-xs text-gray-500 ml-auto">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.body}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                <form onSubmit={postComment} className="border-t border-gray-800 p-4 space-y-3">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    placeholder="Add a comment…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                  <div className="flex items-center justify-between">
                    {isStaff && (
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        <Lock className="h-3.5 w-3.5" />
                        Internal note
                      </label>
                    )}
                    <button
                      type="submit"
                      disabled={posting || !body.trim()}
                      className="ml-auto flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {posting ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tab === 'audit' && (
              <div>
                {audit.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No audit entries yet.</p>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {audit.map(entry => {
                      const actor = entry.user as { full_name: string; email: string } | undefined
                      return (
                        <div key={entry.id} className="px-5 py-4 flex items-start gap-3">
                          <Clock className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium text-gray-100">
                                {actor?.full_name || actor?.email || 'System'}
                              </span>{' '}
                              {entry.action === 'created' ? 'created this ticket' : (
                                <>
                                  changed <span className="text-gray-100 font-medium">{Object.keys(entry.changes)[0]}</span>
                                  {' '}from{' '}
                                  <span className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                                    {String(Object.values(entry.changes)[0]?.from ?? '—')}
                                  </span>
                                  {' '}to{' '}
                                  <span className="text-gray-100 bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                                    {String(Object.values(entry.changes)[0]?.to ?? '—')}
                                  </span>
                                </>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(entry.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Status</label>
              {isStaff ? (
                <select
                  value={ticket.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              ) : (
                <StatusBadge status={ticket.status} />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Priority</label>
              {isStaff ? (
                <select
                  value={ticket.priority}
                  onChange={(e) => updateField('priority', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <PriorityBadge priority={ticket.priority} />
              )}
            </div>

            {isStaff && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Assigned To</label>
                <select
                  value={ticket.assigned_to ?? ''}
                  onChange={(e) => updateField('assigned_to', e.target.value || '')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="">Unassigned</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="border-t border-gray-800 pt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Category</span>
                <span className="text-gray-300 capitalize">{ticket.category}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Submitted by</span>
                <span className="text-gray-300">{creator?.full_name || creator?.email || '—'}</span>
              </div>
              {isStaff && assignee && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Assigned to</span>
                  <span className="text-gray-300">{assignee.full_name || assignee.email}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300">{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Resolved</span>
                  <span className="text-gray-300">{new Date(ticket.resolved_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
