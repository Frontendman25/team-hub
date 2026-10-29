import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { PostsModule } from '../posts/posts.module'
import { GetUserUseCase } from './application/get-user.use-case'
import { ListUsersUseCase } from './application/list-users.use-case'
import type { UsersRepository } from './domain/users.repository'
import { DrizzleUsersRepository } from './infrastructure/drizzle-users.repository'
import { UsersController } from './presentation/users.controller'
import { USERS_REPOSITORY } from './users.tokens'

@Module({
  imports: [PostsModule],
  controllers: [UsersController],
  providers: [
    {
      provide: USERS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): UsersRepository =>
        new DrizzleUsersRepository(drizzle.db),
      inject: [DrizzleService]
    },
    GetUserUseCase,
    ListUsersUseCase
  ],
  exports: [GetUserUseCase, ListUsersUseCase]
})
export class UsersModule {}
