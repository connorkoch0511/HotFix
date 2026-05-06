'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import type { Status, Priority } from '@/lib/types'
import { ArrowLeft, Lock, Send, Clock } from 'lucide-react'

const STATUSES: Status[]    = ['open', 'in_progress', 'resolved', 'closed']
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

interface TicketDetail {
  ticket: {
    id: string; title: string; description: string; category: string
    priority: Priority; status: Status; createdBy: string | null
    assignedTo: string | null; createdAt: string; resolvedAt: string | null
  }
  creator:     { fullName: string; email: string } | null
  assignee:    { fullName: string; email: string } | null
  comments:    { id: string; body: string; isInternal: boolean; createdAt: string; author: { fullName: string; email: string } | null }[]
  audit:       { id: string; action: string; changes: Record<string, { from: unknown; to: unknown }>; createdAt: string; actor: { fullName: string; email: string } | null }[]
  technicians: { id: string; fullName: string; email: string }[]
  profile:     { id: string; role: string; fullName: string; email: string }
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [data, setData]       = useState<TicketDetail | null>(null)
  const [tab, setTab]         = useState<'comments' | 'audit'>('comments')
  const [body, setBody]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const isStaff = data?.profile.role === 'admin' || data?.profile.role === 'technician'

  const load = useCallback(async () => {
    const res = await fetch(`/api/tickets/${id}`)
    if (res.status === 404 || res.status === 403) { router.push('/tickets'); return }
    setData(await res.json())
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  const updateField = async (field: string, value: string) => {
    if (!data) return
    setSaving(true)
    const old = (data.ticket as unknown as Record<string, unknown>)[field]
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value, _audit: { field, from: old, to: value } }),
    })
    setData(prev => prev ? { ...prev, ticket: { ...prev.ticket, [field]: value } } : prev)
    setSaving(false)
    // Refresh audit trail
    const res = await fetch(`/api/tickets/${id}`)
    const fresh = await res.json() as TicketDetail
    setData(prev => prev ? { ...prev, audit: fresh.audit } : prev)
  }

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    const res = await fetch(`/api/tickets/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim(), isInternal }),
    })
    if (res.ok) {
      const comment = await res.json()
      setData(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev)
    }
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

  if (!data) return null
  const { ticket, creator, assignee, comments, audit, technicians, profile } = data

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
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Description</h2>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex border-b border-gray-800">
              {(['comments', 'audit'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === t ? 'text-gray-100 border-b-2 border-red-600' : 'text-gray-400 hover:text-gray-100'
                  }`}
                >
                  {t === 'comments' ? `Comments (${comments.length})` : `Audit Trail (${audit.length})`}
                </button>
              ))}
            </div>

            {tab === 'comments' && (
              <div>
                {comments.length === 0
                  ? <p className="text-center text-gray-500 text-sm py-8">No comments yet.</p>
                  : (
                    <div className="divide-y divide-gray-800">
                      {comments.map(c => (
                        <div key={c.id} className={`p-5 ${c.isInternal ? 'bg-yellow-950/10 border-l-2 border-yellow-700' : ''}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-200">
                              {c.author?.fullName || c.author?.email || 'Unknown'}
                            </span>
                            {c.isInternal && (
                              <span className="flex items-center gap-1 text-xs text-yellow-500">
                                <Lock className="h-3 w-3" /> Internal
                              </span>
                            )}
                            <span className="text-xs text-gray-500 ml-auto">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.body}</p>
                        </div>
                      ))}
                    </div>
                  )
                }

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
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
                        <Lock className="h-3.5 w-3.5" /> Internal note
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
                {audit.length === 0
                  ? <p className="text-center text-gray-500 text-sm py-8">No audit entries yet.</p>
                  : (
                    <div className="divide-y divide-gray-800">
                      {audit.map(entry => (
                        <div key={entry.id} className="px-5 py-4 flex items-start gap-3">
                          <Clock className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium text-gray-100">
                                {entry.actor?.fullName || entry.actor?.email || 'System'}
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
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(entry.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Status</label>
              {isStaff ? (
                <select value={ticket.status} onChange={e => updateField('status', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              ) : <StatusBadge status={ticket.status} />}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Priority</label>
              {isStaff ? (
                <select value={ticket.priority} onChange={e => updateField('priority', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : <PriorityBadge priority={ticket.priority} />}
            </div>

            {isStaff && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Assigned To</label>
                <select value={ticket.assignedTo ?? ''} onChange={e => updateField('assignedTo', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors">
                  <option value="">Unassigned</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.fullName || t.email}</option>)}
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
                <span className="text-gray-300">{creator?.fullName || creator?.email || '—'}</span>
              </div>
              {isStaff && assignee && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Assigned to</span>
                  <span className="text-gray-300">{assignee.fullName || assignee.email}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Resolved</span>
                  <span className="text-gray-300">{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {profile.id === ticket.createdBy && ticket.status !== 'closed' && (
            <button
              onClick={() => updateField('status', 'closed')}
              className="w-full text-sm text-gray-400 border border-gray-700 hover:border-red-700 hover:text-red-400 rounded-xl py-2 transition-colors"
            >
              Close ticket
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
