export type Role = 'admin' | 'technician' | 'end_user'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Status = 'open' | 'in_progress' | 'resolved' | 'closed'
export type Category = 'hardware' | 'software' | 'network' | 'access' | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  department: string | null
  created_at: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  category: Category
  priority: Priority
  status: Status
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  creator?: Profile
  assignee?: Profile
}

export interface Comment {
  id: string
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
  created_at: string
  author?: Profile
}

export interface AuditEntry {
  id: string
  ticket_id: string
  user_id: string
  action: string
  changes: Record<string, { from: unknown; to: unknown }>
  created_at: string
  user?: Profile
}
