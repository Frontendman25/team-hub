import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import { hasAtLeast } from '../../workspaces/domain/roles'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { TasksRepository } from '../domain/tasks.repository'
import { TASKS_REPOSITORY } from '../tasks.tokens'

@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject(TASKS_REPOSITORY)
    private readonly tasks: TasksRepository,
    private readonly access: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(taskId: string, actorId: string): Promise<void> {
    const task = await this.tasks.findById(taskId)
    if (!task) {
      throw new NotFoundError('Task not found')
    }
    const { role } = await this.access.requireMember(task.workspaceId, actorId)
    await this.demo.assertOwnInDemo({
      workspaceId: task.workspaceId,
      actorId,
      ownerId: task.createdBy
    })
    if (task.createdBy !== actorId && !hasAtLeast(role, 'admin')) {
      throw new ForbiddenError('You cannot delete this task')
    }
    await this.tasks.delete(taskId)
  }
}
