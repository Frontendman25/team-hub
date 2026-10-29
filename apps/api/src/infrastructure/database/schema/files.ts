import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { messages } from './messaging'
import { posts } from './posts'
import { users } from './users'
import { workspaces } from './workspaces'

export const files = pgTable(
  'files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 127 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    messageId: uuid('message_id').references(() => messages.id, {
      onDelete: 'set null'
    }),
    postId: uuid('post_id').references(() => posts.id, {
      onDelete: 'set null'
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('files_object_key_uidx').on(table.objectKey),
    index('files_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('files_message_idx').on(table.messageId),
    index('files_post_idx').on(table.postId),
    index('files_uploader_idx').on(table.uploadedBy),
    check('files_byte_size_positive', sql`${table.byteSize} > 0`),
    check(
      'files_one_parent',
      sql`NOT (${table.messageId} IS NOT NULL AND ${table.postId} IS NOT NULL)`
    )
  ]
)
