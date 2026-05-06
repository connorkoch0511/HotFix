'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Profile, Role } from '@/lib/types'
import { ShieldCheck, UserCog } from 'lucide-react'

const ROLES: Role[] = ['admin', 'technician', 'end_user']

const roleColor: Record<Role, string> = {
  admin:      'text-red-400',
  technician: 'text-blue-400',
  end_user:   'text-gray-400',
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers]       = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/sign-in'); return }
      setCurrentId(user.id)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/'); return }

      const { data } = await supabase.from('profiles').select('*').order('created_at')
      setUsers((data ?? []) as Profile[])
      setLoading(false)
    }
    init()
  }, [router])

  const changeRole = async (userId: string, role: Role) => {
    setSaving(userId)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-100">Admin Panel</h1>
        </div>
        <p className="text-sm text-gray-400">Manage user roles and access permissions.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-gray-400" />
          <h2 className="font-semibold text-gray-100">Users ({users.length})</h2>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Department</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map(user => (
              <tr key={user.id} className={user.id === currentId ? 'bg-gray-800/30' : ''}>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-100">{user.full_name || '—'}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </td>
                <td className="px-4 py-4 text-gray-400 text-xs hidden md:table-cell">{user.department || '—'}</td>
                <td className="px-4 py-4 text-gray-400 text-xs hidden lg:table-cell">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  {user.id === currentId ? (
                    <span className={`text-xs font-medium ${roleColor[user.role]}`}>{user.role}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value as Role)}
                        disabled={saving === user.id}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {saving === user.id && (
                        <div className="w-3.5 h-3.5 border border-red-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-100 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { role: 'end_user',   color: 'border-gray-700', label: 'End User', perms: ['Submit tickets', 'View own tickets', 'Post comments'] },
            { role: 'technician', color: 'border-blue-800', label: 'Technician', perms: ['All End User permissions', 'View all tickets', 'Update status & priority', 'Assign tickets', 'Internal notes', 'View audit trail'] },
            { role: 'admin',      color: 'border-red-800',  label: 'Admin', perms: ['All Technician permissions', 'Manage user roles', 'Full audit access'] },
          ].map(({ role, color, label, perms }) => (
            <div key={role} className={`border ${color} rounded-xl p-4`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${roleColor[role as Role]}`}>{label}</p>
              <ul className="space-y-1">
                {perms.map(p => (
                  <li key={p} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
