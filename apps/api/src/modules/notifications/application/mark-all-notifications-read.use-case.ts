import { Inject, Injectable } from '@nestjs/common'
import type { NotificationsRepository } from '../domain/notifications.repository'
import { UnreadCountCache } from '../infrastructure/unread-count.cache'
import { NOTIFICATIONS_REPOSITORY } from '../notifications.tokens'

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepository,
    private readonly unreadCache: UnreadCountCache
  ) {}

  async execute(recipientId: string) {
    const updated = await this.notifications.markAllRead(recipientId)
    await this.unreadCache.invalidate(recipientId)
    return updated
  }
}
