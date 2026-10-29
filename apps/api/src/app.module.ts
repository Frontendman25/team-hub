import { Module } from '@nestjs/common'
import { AppConfigModule } from './infrastructure/config/app-config.module'
import { DatabaseModule } from './infrastructure/database/database.module'
import { IdentityModule } from './infrastructure/identity/identity.module'
import { loggerModule } from './infrastructure/logging/logger.module'
import { RedisModule } from './infrastructure/redis/redis.module'
import { AuthModule } from './modules/auth/auth.module'
import { CommentsModule } from './modules/comments/comments.module'
import { HealthModule } from './modules/health/health.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { PostsModule } from './modules/posts/posts.module'
import { ReactionsModule } from './modules/reactions/reactions.module'
import { StatsModule } from './modules/stats/stats.module'
import { UsersModule } from './modules/users/users.module'
import { MessagingModule } from './modules/messaging/messaging.module'
import { FilesModule } from './modules/files/files.module'
import { SearchModule } from './modules/search/search.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { DemoModule } from './modules/demo/demo.module'
import { WorkspacesModule } from './modules/workspaces/workspaces.module'

@Module({
  imports: [
    AppConfigModule,
    loggerModule,
    DatabaseModule,
    RedisModule,
    IdentityModule,
    AuthModule,
    DemoModule,
    HealthModule,
    WorkspacesModule,
    FilesModule,
    MessagingModule,
    SearchModule,
    TasksModule,
    PostsModule,
    NotificationsModule,
    CommentsModule,
    ReactionsModule,
    UsersModule,
    StatsModule
  ]
})
export class AppModule {}
