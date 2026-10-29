import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { PostsModule } from '../posts/posts.module'
import { AddReactionUseCase } from './application/add-reaction.use-case'
import { RemoveReactionUseCase } from './application/remove-reaction.use-case'
import type { ReactionsRepository } from './domain/reactions.repository'
import { DrizzleReactionsRepository } from './infrastructure/drizzle-reactions.repository'
import { ReactionsController } from './presentation/reactions.controller'
import { REACTIONS_REPOSITORY } from './reactions.tokens'

@Module({
  imports: [PostsModule, NotificationsModule],
  controllers: [ReactionsController],
  providers: [
    {
      provide: REACTIONS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): ReactionsRepository =>
        new DrizzleReactionsRepository(drizzle.db),
      inject: [DrizzleService]
    },
    AddReactionUseCase,
    RemoveReactionUseCase
  ]
})
export class ReactionsModule {}
