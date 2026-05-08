import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { tickets, profiles } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import type { Status, Priority, Category } from '@/lib/types'
import { Plus } from 'lucide-react'

const STATUSES: Status[]    = ['open', 'in_progress', 'resolved', 'closed']
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const CATEGORIES: Category[] = ['hardware', 'software', 'network', 'access', 'other']

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; category?: string }>
}) {
  const params = await searchParams
  const { userId, orgId } = await auth()
  if (!userId || !orgId) redirect('/sign-in')

  const db = getDb()
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const creators  = alias(profiles, 'creators')
  const assignees = alias(profiles, 'assignees')

  const conditions = [eq(tickets.organizationId, orgId)]
  if (!isStaff) conditions.push(eq(tickets.createdBy, userId))
  if (params.status   && STATUSES.includes(params.status as Status))       conditions.push(eq(tickets.status, params.status as Status))
  if (params.priority && PRIORITIES.includes(params.priority as Priority)) conditions.push(eq(tickets.priority, params.priority as Priority))
  if (params.category && CATEGORIES.includes(params.category as Category)) conditions.push(eq(tickets.category, params.category as Category))
  const rows = await db
    .select({
      ticket:   tickets,
      creator:  { fullName: creators.fullName, email: creators.email },
      assignee: { fullName: assignees.fullName, email: assignees.email },
    })
    .from(tickets)
    .leftJoin(creators,  eq(tickets.createdBy,  creators.id))
    .leftJoin(assignees, eq(tickets.assignedTo, assignees.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tickets.createdAt))

  const buildUrl = (key: string, val: string) => {
    const p = new URLSearchParams(params as Record<string, string>)
    if (p.get(key) === val) { p.delete(key) } else { p.set(key, val) }
    return `/tickets?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Tickets</h1>
        <Link
          href="/tickets/new"
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <Link key={s} href={buildUrl('status', s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              params.status === s ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100'
            }`}
          >{s.replace('_', ' ')}</Link>
        ))}
        <span className="w-px bg-gray-700 mx-1" />
        {PRIORITIES.map(p => (
          <Link key={p} href={buildUrl('priority', p)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              params.priority === p ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100'
            }`}
          >{p}</Link>
        ))}
        <span className="w-px bg-gray-700 mx-1" />
        {CATEGORIES.map(c => (
          <Link key={c} href={buildUrl('category', c)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              params.category === c ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100'
            }`}
          >{c}</Link>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500 text-sm">No tickets match your filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                {isStaff && <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Assigned</th>}
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map(({ ticket, assignee }) => (
                <tr key={ticket.id} className="hover:bg-gray-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <Link href={`/tickets/${ticket.id}`} className="font-medium text-gray-100 group-hover:text-red-400 transition-colors">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-gray-400 capitalize hidden md:table-cell">{ticket.category}</td>
                  <td className="px-4 py-4"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="px-4 py-4"><StatusBadge status={ticket.status} /></td>
                  {isStaff && (
                    <td className="px-4 py-4 text-gray-400 text-xs hidden lg:table-cell">
                      {assignee?.fullName || assignee?.email || '—'}
                    </td>
                  )}
                  <td className="px-4 py-4 text-gray-400 text-xs hidden lg:table-cell">
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-600 text-right">{rows.length} ticket{rows.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
