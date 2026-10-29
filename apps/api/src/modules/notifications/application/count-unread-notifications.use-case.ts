import { Inject, Injectable } from '@nestjs/common'
import type { NotificationsRepository } from '../domain/notifications.repository'
import { UnreadCountCache } from '../infrastructure/unread-count.cache'
import { NOTIFICATIONS_REPOSITORY } from '../notifications.tokens'

export type UnreadCountResult = {
  count: number
  cache: 'hit' | 'miss'
}

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepository,
    private readonly unreadCache: UnreadCountCache
  ) {}

  async execute(recipientId: string): Promise<UnreadCountResult> {
    const cached = await this.unreadCache.read(recipientId)
    if (cached !== null) {
      return { count: cached, cache: 'hit' }
    }
    const count = await this.notifications.countUnread(recipientId)
    await this.unreadCache.write(recipientId, count)
    return { count, cache: 'miss' }
  }
}
