import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, NotFoundError } from '../../../shared/domain/errors'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { WorkspaceRepository } from '../../workspaces/domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../../workspaces/workspaces.tokens'
import type { TasksRepository } from '../domain/tasks.repository'
import type { TaskPriority } from '../tasks.constants'
import { TASKS_REPOSITORY } from '../tasks.tokens'
import { assertAssignee } from './create-task.use-case'
import { serializeTask } from './serialize-task'

@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(TASKS_REPOSITORY)
    private readonly tasks: TasksRepository,
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    taskId: string
    actorId: string
    expectedVersion: number
    title?: string
    description?: string
    priority?: TaskPriority
    assigneeId?: string | null
    dueDate?: string | null
  }) {
    const current = await this.tasks.findById(input.taskId)
    if (!current) {
      throw new NotFoundError('Task not found')
    }
    await this.access.requireMember(current.workspaceId, input.actorId)
    await this.demo.assertOwnInDemo({
      workspaceId: current.workspaceId,
      actorId: input.actorId,
      ownerId: current.createdBy
    })
    if (input.assigneeId !== undefined) {
      await assertAssignee(
        this.workspaces,
        current.workspaceId,
        input.assigneeId
      )
    }
    const result = await this.tasks.update(input.taskId, {
      title: input.title?.trim(),
      description: input.description?.trim(),
      priority: input.priority,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate,
      expectedVersion: input.expectedVersion
    })
    if (!result.ok) {
      if (result.reason === 'stale') {
        throw new ConflictError(
          'Task was updated by someone else — refresh and try again'
        )
      }
      throw new NotFoundError('Task not found')
    }
    return serializeTask(result.task)
  }
}
