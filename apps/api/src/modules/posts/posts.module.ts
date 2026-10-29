import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { FilesModule } from '../files/files.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { CreatePostUseCase } from './application/create-post.use-case'
import { DeletePostUseCase } from './application/delete-post.use-case'
import { GetPostUseCase } from './application/get-post.use-case'
import { ListPostsUseCase } from './application/list-posts.use-case'
import { UpdatePostUseCase } from './application/update-post.use-case'
import type { PostRepository } from './domain/post.repository'
import { DrizzlePostRepository } from './infrastructure/drizzle-post.repository'
import { PostsController } from './presentation/posts.controller'
import { POSTS_REPOSITORY } from './posts.tokens'

@Module({
  imports: [WorkspacesModule, FilesModule],
  controllers: [PostsController],
  providers: [
    {
      provide: POSTS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): PostRepository =>
        new DrizzlePostRepository(drizzle.db),
      inject: [DrizzleService]
    },
    CreatePostUseCase,
    ListPostsUseCase,
    GetPostUseCase,
    UpdatePostUseCase,
    DeletePostUseCase
  ],
  exports: [ListPostsUseCase, GetPostUseCase, POSTS_REPOSITORY]
})
export class PostsModule {}
