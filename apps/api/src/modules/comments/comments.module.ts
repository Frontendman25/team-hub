import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { PostsModule } from '../posts/posts.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { CreateCommentUseCase } from './application/create-comment.use-case'
import { DeleteCommentUseCase } from './application/delete-comment.use-case'
import { ListCommentsUseCase } from './application/list-comments.use-case'
import type { CommentsRepository } from './domain/comments.repository'
import { DrizzleCommentsRepository } from './infrastructure/drizzle-comments.repository'
import { CommentsController } from './presentation/comments.controller'
import { COMMENTS_REPOSITORY } from './comments.tokens'

@Module({
  imports: [PostsModule, NotificationsModule, WorkspacesModule],
  controllers: [CommentsController],
  providers: [
    {
      provide: COMMENTS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): CommentsRepository =>
        new DrizzleCommentsRepository(drizzle.db),
      inject: [DrizzleService]
    },
    ListCommentsUseCase,
    CreateCommentUseCase,
    DeleteCommentUseCase
  ]
})
export class CommentsModule {}
