import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { CountUnreadNotificationsUseCase } from './application/count-unread-notifications.use-case'
import { CreateNotificationUseCase } from './application/create-notification.use-case'
import { ListNotificationsUseCase } from './application/list-notifications.use-case'
import { MarkAllNotificationsReadUseCase } from './application/mark-all-notifications-read.use-case'
import { MarkNotificationReadUseCase } from './application/mark-notification-read.use-case'
import type { NotificationsRepository } from './domain/notifications.repository'
import { DrizzleNotificationsRepository } from './infrastructure/drizzle-notifications.repository'
import { UnreadCountCache } from './infrastructure/unread-count.cache'
import { NotificationsController } from './presentation/notifications.controller'
import { NOTIFICATIONS_REPOSITORY } from './notifications.tokens'

@Module({
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): NotificationsRepository =>
        new DrizzleNotificationsRepository(drizzle.db),
      inject: [DrizzleService]
    },
    UnreadCountCache,
    CreateNotificationUseCase,
    ListNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase
  ],
  exports: [CreateNotificationUseCase]
})
export class NotificationsModule {}
