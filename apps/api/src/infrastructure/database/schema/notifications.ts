import { sql } from 'drizzle-orm'
import {
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { comments } from './comments'
import { posts } from './posts'
import { users } from './users'
import { workspaceInvitations, workspaces } from './workspaces'

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 32 }).notNull(),
    postId: uuid('post_id').references(() => posts.id, {
      onDelete: 'set null'
    }),
    commentId: uuid('comment_id').references(() => comments.id, {
      onDelete: 'set null'
    }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, {
      onDelete: 'set null'
    }),
    invitationId: uuid('invitation_id').references(
      () => workspaceInvitations.id,
      { onDelete: 'set null' }
    ),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    check(
      'notifications_type_check',
      sql`${table.type} in ('comment', 'reaction', 'invitation')`
    ),
    check(
      'notifications_not_self_check',
      sql`${table.recipientId} <> ${table.actorId}`
    ),
    index('notifications_recipient_created_idx').on(
      table.recipientId,
      table.createdAt
    ),
    index('notifications_recipient_unread_idx')
      .on(table.recipientId)
      .where(sql`${table.readAt} is null`),
    uniqueIndex('notifications_comment_id_uidx')
      .on(table.commentId)
      .where(sql`${table.type} = 'comment' and ${table.commentId} is not null`),
    uniqueIndex('notifications_reaction_actor_post_uidx')
      .on(table.recipientId, table.actorId, table.postId)
      .where(sql`${table.type} = 'reaction'`),
    uniqueIndex('notifications_invitation_id_uidx')
      .on(table.invitationId)
      .where(
        sql`${table.type} = 'invitation' and ${table.invitationId} is not null`
      )
  ]
)
