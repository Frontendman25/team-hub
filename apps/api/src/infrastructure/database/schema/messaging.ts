import { sql } from 'drizzle-orm'
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { workspaces } from './workspaces'

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 16 }).notNull(),
    name: varchar('name', { length: 80 }),
    slug: varchar('slug', { length: 80 }),
    topic: text('topic').notNull().default(''),
    dmKey: varchar('dm_key', { length: 80 }),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    index('conversations_workspace_idx').on(table.workspaceId),
    uniqueIndex('conversations_channel_slug_uidx')
      .on(table.workspaceId, table.slug)
      .where(sql`${table.type} = 'channel'`),
    uniqueIndex('conversations_dm_key_uidx')
      .on(table.workspaceId, table.dmKey)
      .where(sql`${table.type} = 'dm'`)
  ]
)

export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    uniqueIndex('conversation_members_pk').on(
      table.conversationId,
      table.userId
    ),
    index('conversation_members_user_idx').on(table.userId)
  ]
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    content: text('content').notNull(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    uniqueIndex('messages_idempotency_uidx').on(
      table.conversationId,
      table.authorId,
      table.clientId
    ),
    index('messages_conversation_created_idx').on(
      table.conversationId,
      table.createdAt,
      table.id
    ),
    index('messages_author_idx').on(table.authorId)
  ]
)
