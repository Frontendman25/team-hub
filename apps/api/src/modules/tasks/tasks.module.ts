import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { MessagingModule } from '../messaging/messaging.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { CreateTaskUseCase } from './application/create-task.use-case'
import { DeleteTaskUseCase } from './application/delete-task.use-case'
import { GetTaskUseCase } from './application/get-task.use-case'
import { ListTasksUseCase } from './application/list-tasks.use-case'
import { MoveTaskUseCase } from './application/move-task.use-case'
import { UpdateTaskUseCase } from './application/update-task.use-case'
import type { TasksRepository } from './domain/tasks.repository'
import { DrizzleTasksRepository } from './infrastructure/drizzle-tasks.repository'
import { TasksController } from './presentation/tasks.controller'
import { TASKS_REPOSITORY } from './tasks.tokens'

@Module({
  imports: [WorkspacesModule, MessagingModule],
  controllers: [TasksController],
  providers: [
    {
      provide: TASKS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): TasksRepository =>
        new DrizzleTasksRepository(drizzle.db),
      inject: [DrizzleService]
    },
    CreateTaskUseCase,
    ListTasksUseCase,
    GetTaskUseCase,
    UpdateTaskUseCase,
    MoveTaskUseCase,
    DeleteTaskUseCase
  ]
})
export class TasksModule {}
