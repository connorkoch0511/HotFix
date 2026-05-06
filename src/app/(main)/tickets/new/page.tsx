'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Priority, Category } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'hardware',  label: 'Hardware' },
  { value: 'software',  label: 'Software' },
  { value: 'network',   label: 'Network' },
  { value: 'access',    label: 'Access / Permissions' },
  { value: 'other',     label: 'Other' },
]

const PRIORITIES: { value: Priority; label: string; desc: string }[] = [
  { value: 'critical', label: 'Critical', desc: 'System down, blocking production' },
  { value: 'high',     label: 'High',     desc: 'Major feature broken, no workaround' },
  { value: 'medium',   label: 'Medium',   desc: 'Degraded function, workaround exists' },
  { value: 'low',      label: 'Low',      desc: 'Minor issue or question' },
]

export default function NewTicketPage() {
  const router = useRouter()
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory]     = useState<Category>('software')
  const [priority, setPriority]     = useState<Priority>('medium')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category, priority }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      setError(error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    const { id } = await res.json()
    router.push(`/tickets/${id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/tickets" className="text-gray-400 hover:text-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">New Ticket</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Briefly describe the issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
              placeholder="Steps to reproduce, error messages, affected users…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl px-6 py-2.5 transition-colors"
          >
            {loading ? 'Submitting…' : 'Submit Ticket'}
          </button>
          <Link href="/tickets" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
