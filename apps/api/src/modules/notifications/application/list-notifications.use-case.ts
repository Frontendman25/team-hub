import { Inject, Injectable } from '@nestjs/common'
import type { NotificationsRepository } from '../domain/notifications.repository'
import { NOTIFICATIONS_REPOSITORY } from '../notifications.tokens'

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepository
  ) {}

  execute(recipientId: string, limit: number) {
    return this.notifications.listByRecipient(recipientId, limit)
  }
}
