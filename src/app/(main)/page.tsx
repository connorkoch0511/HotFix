import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { tickets, profiles } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import { Plus, Ticket as TicketIcon, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'

function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: number; icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${accent}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-100">{value}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await getDb().query.profiles.findFirst({ where: eq(profiles.id, userId) })
  const isStaff = profile?.role === 'admin' || profile?.role === 'technician'

  const allTickets = await getDb()
    .select()
    .from(tickets)
    .where(isStaff ? undefined : eq(tickets.createdBy, userId))
    .orderBy(desc(tickets.createdAt))

  const open       = allTickets.filter(t => t.status === 'open').length
  const inProgress = allTickets.filter(t => t.status === 'in_progress').length
  const resolved   = allTickets.filter(t => t.status === 'resolved').length
  const critical   = allTickets.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length
  const recent     = allTickets.slice(0, 8)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Overview of {isStaff ? 'all' : 'your'} tickets</p>
        </div>
        <Link
          href="/tickets/new"
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open"        value={open}       icon={TicketIcon}   accent="bg-blue-600" />
        <StatCard label="In Progress" value={inProgress}  icon={Clock}        accent="bg-purple-600" />
        <StatCard label="Resolved"    value={resolved}    icon={CheckCircle2} accent="bg-green-600" />
        <StatCard label="Critical"    value={critical}    icon={AlertCircle}  accent="bg-red-600" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-100">Recent Tickets</h2>
          <Link href="/tickets" className="text-sm text-red-400 hover:text-red-300 transition-colors">
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            No tickets yet.{' '}
            <Link href="/tickets/new" className="text-red-400 hover:text-red-300">Create one.</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {recent.map(ticket => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{ticket.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}{ticket.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
