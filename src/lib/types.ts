export type Role     = 'admin' | 'technician' | 'end_user'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Status   = 'open' | 'in_progress' | 'resolved' | 'closed'
export type Category = 'hardware' | 'software' | 'network' | 'access' | 'other'

// Matches Drizzle camelCase column names
export interface Profile {
  id:         string
  email:      string
  fullName:   string
  role:       Role
  department: string | null
  createdAt:  Date | string
}

export interface Ticket {
  id:          string
  title:       string
  description: string
  category:    Category
  priority:    Priority
  status:      Status
  createdBy:   string | null
  assignedTo:  string | null
  createdAt:   Date | string
  updatedAt:   Date | string
  resolvedAt:  Date | string | null
}

export interface Comment {
  id:         string
  ticketId:   string
  authorId:   string | null
  body:       string
  isInternal: boolean
  createdAt:  Date | string
}

export interface AuditEntry {
  id:        string
  ticketId:  string
  userId:    string | null
  action:    string
  changes:   Record<string, { from: unknown; to: unknown }>
  createdAt: Date | string
}
