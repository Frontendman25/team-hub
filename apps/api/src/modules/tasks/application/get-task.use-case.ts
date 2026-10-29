import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/domain/errors'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { TasksRepository } from '../domain/tasks.repository'
import { TASKS_REPOSITORY } from '../tasks.tokens'
import { serializeTask } from './serialize-task'

@Injectable()
export class GetTaskUseCase {
  constructor(
    @Inject(TASKS_REPOSITORY)
    private readonly tasks: TasksRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(taskId: string, actorId: string) {
    const task = await this.tasks.findById(taskId)
    if (!task) {
      throw new NotFoundError('Task not found')
    }
    await this.access.requireMember(task.workspaceId, actorId)
    return serializeTask(task)
  }
}
