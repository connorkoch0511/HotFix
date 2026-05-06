import type { Priority } from '@/lib/types'

const config: Record<Priority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-950 text-red-300 border-red-800' },
  high:     { label: 'High',     className: 'bg-orange-950 text-orange-300 border-orange-800' },
  medium:   { label: 'Medium',   className: 'bg-yellow-950 text-yellow-300 border-yellow-800' },
  low:      { label: 'Low',      className: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = config[priority]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${className}`}>
      {label}
    </span>
  )
}
