import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/domain/errors'
import type { NotificationsRepository } from '../domain/notifications.repository'
import { UnreadCountCache } from '../infrastructure/unread-count.cache'
import { NOTIFICATIONS_REPOSITORY } from '../notifications.tokens'

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepository,
    private readonly unreadCache: UnreadCountCache
  ) {}

  async execute(id: string, recipientId: string): Promise<void> {
    const updated = await this.notifications.markRead(id, recipientId)
    if (!updated) {
      throw new NotFoundError('Notification not found')
    }
    await this.unreadCache.invalidate(recipientId)
  }
}
