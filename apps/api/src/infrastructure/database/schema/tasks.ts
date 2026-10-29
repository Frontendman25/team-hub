import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { workspaces } from './workspaces'

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull().default(''),
    status: varchar('status', { length: 16 }).notNull(),
    priority: varchar('priority', { length: 16 }).notNull().default('medium'),
    position: integer('position').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    dueDate: date('due_date', { mode: 'string' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    unique('tasks_workspace_status_position_uidx').on(
      table.workspaceId,
      table.status,
      table.position
    ),
    index('tasks_workspace_status_idx').on(
      table.workspaceId,
      table.status,
      table.position
    ),
    index('tasks_workspace_assignee_idx').on(
      table.workspaceId,
      table.assigneeId
    ),
    index('tasks_workspace_created_idx').on(table.workspaceId, table.createdAt)
  ]
)
