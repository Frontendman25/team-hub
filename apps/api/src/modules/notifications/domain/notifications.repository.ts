export const notificationTypes = ['comment', 'reaction', 'invitation'] as const

export type NotificationType = (typeof notificationTypes)[number]

export type NotificationActor = {
  id: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
}

export type NotificationRecord = {
  id: string
  type: NotificationType
  postId: string | null
  commentId: string | null
  workspaceId: string | null
  invitationId: string | null
  workspaceSlug: string | null
  workspaceName: string | null
  readAt: Date | null
  createdAt: Date
  postDeleted: boolean
  postPreview: string | null
  actor: NotificationActor
}

export type CreateNotificationData = {
  recipientId: string
  actorId: string
  type: NotificationType
  postId?: string | null
  commentId?: string | null
  workspaceId?: string | null
  invitationId?: string | null
}

export interface NotificationsRepository {
  create(data: CreateNotificationData): Promise<void>
  listByRecipient(
    recipientId: string,
    limit: number
  ): Promise<NotificationRecord[]>
  countUnread(recipientId: string): Promise<number>
  markRead(id: string, recipientId: string): Promise<boolean>
  markAllRead(recipientId: string): Promise<number>
}
