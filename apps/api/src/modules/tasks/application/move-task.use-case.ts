import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, NotFoundError } from '../../../shared/domain/errors'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { TasksRepository } from '../domain/tasks.repository'
import type { TaskStatus } from '../tasks.constants'
import { TASKS_REPOSITORY } from '../tasks.tokens'
import { serializeTask } from './serialize-task'

@Injectable()
export class MoveTaskUseCase {
  constructor(
    @Inject(TASKS_REPOSITORY)
    private readonly tasks: TasksRepository,
    private readonly access: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    taskId: string
    actorId: string
    status: TaskStatus
    position: number
    expectedVersion: number
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
    const result = await this.tasks.move(
      input.taskId,
      input.status,
      input.position,
      input.expectedVersion
    )
    if (!result.ok) {
      if (result.reason === 'stale') {
        throw new ConflictError(
          'Task was updated by someone else — refresh and try again'
        )
      }
      throw new NotFoundError('Task not found')
    }
    return {
      task: serializeTask(result.task),
      data: result.board.map(serializeTask)
    }
  }
}
