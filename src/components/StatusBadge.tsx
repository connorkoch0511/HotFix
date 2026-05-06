import type { Status } from '@/lib/types'

const config: Record<Status, { label: string; className: string }> = {
  open:        { label: 'Open',        className: 'bg-blue-950 text-blue-300 border-blue-800' },
  in_progress: { label: 'In Progress', className: 'bg-purple-950 text-purple-300 border-purple-800' },
  resolved:    { label: 'Resolved',    className: 'bg-green-950 text-green-300 border-green-800' },
  closed:      { label: 'Closed',      className: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${className}`}>
      {label}
    </span>
  )
}
