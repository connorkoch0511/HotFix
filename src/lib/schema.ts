import {
  pgTable, text, uuid, timestamp, boolean, jsonb,
} from 'drizzle-orm/pg-core'
import type { Priority, Status, Category, Role } from './types'

export const profiles = pgTable('profiles', {
  id:         text('id').primaryKey(),            // Clerk user ID
  email:      text('email').notNull(),
  fullName:   text('full_name').notNull().default(''),
  role:       text('role').$type<Role>().notNull().default('end_user'),
  department: text('department'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const tickets = pgTable('tickets', {
  id:             uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id'),
  title:          text('title').notNull(),
  description: text('description').notNull(),
  category:    text('category').$type<Category>().notNull(),
  priority:    text('priority').$type<Priority>().notNull().default('medium'),
  status:      text('status').$type<Status>().notNull().default('open'),
  createdBy:   text('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  assignedTo:  text('assigned_to').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
  resolvedAt:  timestamp('resolved_at'),
})

export const ticketComments = pgTable('ticket_comments', {
  id:         uuid('id').primaryKey().defaultRandom(),
  ticketId:   uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  authorId:   text('author_id').references(() => profiles.id, { onDelete: 'set null' }),
  body:       text('body').notNull(),
  isInternal: boolean('is_internal').notNull().default(false),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const ticketAudit = pgTable('ticket_audit', {
  id:        uuid('id').primaryKey().defaultRandom(),
  ticketId:  uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  userId:    text('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  action:    text('action').notNull(),
  changes:   jsonb('changes').$type<Record<string, { from: unknown; to: unknown }>>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
