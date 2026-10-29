import { Injectable } from '@nestjs/common'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { notifications } from '../../../infrastructure/database/schema/notifications'
import { posts } from '../../../infrastructure/database/schema/posts'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import { workspaces } from '../../../infrastructure/database/schema/workspaces'
import type {
  CreateNotificationData,
  NotificationRecord,
  NotificationType,
  NotificationsRepository
} from '../domain/notifications.repository'

const POST_PREVIEW_LENGTH = 80

@Injectable()
export class DrizzleNotificationsRepository implements NotificationsRepository {
  constructor(private readonly db: Database) {}

  async create(data: CreateNotificationData): Promise<void> {
    const values = {
      recipientId: data.recipientId,
      actorId: data.actorId,
      type: data.type,
      postId: data.postId ?? null,
      commentId: data.commentId ?? null,
      workspaceId: data.workspaceId ?? null,
      invitationId: data.invitationId ?? null
    }

    if (data.type === 'reaction') {
      await this.db
        .insert(notifications)
        .values(values)
        .onConflictDoUpdate({
          target: [
            notifications.recipientId,
            notifications.actorId,
            notifications.postId
          ],
          targetWhere: sql`${notifications.type} = 'reaction'`,
          set: {
            readAt: null,
            createdAt: sql`now()`
          }
        })
      return
    }

    if (data.type === 'invitation') {
      await this.db.insert(notifications).values(values).onConflictDoNothing()
      return
    }

    await this.db
      .insert(notifications)
      .values(values)
      .onConflictDoNothing({
        target: notifications.commentId,
        where: sql`${notifications.type} = 'comment' and ${notifications.commentId} is not null`
      })
  }

  async listByRecipient(
    recipientId: string,
    limit: number
  ): Promise<NotificationRecord[]> {
    const rows = await this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        postId: notifications.postId,
        commentId: notifications.commentId,
        workspaceId: notifications.workspaceId,
        invitationId: notifications.invitationId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        postContent: posts.content,
        workspaceSlug: workspaces.slug,
        workspaceName: workspaces.name,
        actorId: notifications.actorId,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl
      })
      .from(notifications)
      .innerJoin(profiles, eq(profiles.userId, notifications.actorId))
      .leftJoin(posts, eq(posts.id, notifications.postId))
      .leftJoin(workspaces, eq(workspaces.id, notifications.workspaceId))
      .where(eq(notifications.recipientId, recipientId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)

    return rows.map((row) => this.toRecord(row))
  }

  async countUnread(recipientId: string): Promise<number> {
    const [row] = await this.db
      .select({
        count: sql<number>`cast(count(*) as int)`
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          isNull(notifications.readAt)
        )
      )

    return row?.count ?? 0
  }

  async markRead(id: string, recipientId: string): Promise<boolean> {
    const updated = await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientId, recipientId)
        )
      )
      .returning({ id: notifications.id })

    return updated.length > 0
  }

  async markAllRead(recipientId: string): Promise<number> {
    const updated = await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          isNull(notifications.readAt)
        )
      )
      .returning({ id: notifications.id })

    return updated.length
  }

  private toRecord(row: {
    id: string
    type: string
    postId: string | null
    commentId: string | null
    workspaceId: string | null
    invitationId: string | null
    readAt: Date | null
    createdAt: Date
    postContent: string | null
    workspaceSlug: string | null
    workspaceName: string | null
    actorId: string
    displayName: string
    jobTitle: string
    avatarUrl: string | null
  }): NotificationRecord {
    const isInvite = row.type === 'invitation'
    return {
      id: row.id,
      type: row.type as NotificationType,
      postId: row.postId,
      commentId: row.commentId,
      workspaceId: row.workspaceId,
      invitationId: row.invitationId,
      workspaceSlug: row.workspaceSlug,
      workspaceName: row.workspaceName,
      readAt: row.readAt,
      createdAt: row.createdAt,
      postDeleted: isInvite
        ? false
        : row.postId === null || row.postContent === null,
      postPreview: row.postContent
        ? row.postContent.slice(0, POST_PREVIEW_LENGTH)
        : null,
      actor: {
        id: row.actorId,
        displayName: row.displayName,
        jobTitle: row.jobTitle,
        avatarUrl: row.avatarUrl
      }
    }
  }
}
