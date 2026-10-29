import { Inject, Injectable } from '@nestjs/common'
import type {
  CreateNotificationData,
  NotificationsRepository
} from '../domain/notifications.repository'
import { UnreadCountCache } from '../infrastructure/unread-count.cache'
import { NOTIFICATIONS_REPOSITORY } from '../notifications.tokens'

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepository,
    private readonly unreadCache: UnreadCountCache
  ) {}

  async execute(input: CreateNotificationData): Promise<void> {
    if (input.recipientId === input.actorId) {
      return
    }

    await this.notifications.create(input)
    await this.unreadCache.invalidate(input.recipientId)
  }
}
