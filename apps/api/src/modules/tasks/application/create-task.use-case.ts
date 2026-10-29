import { Inject, Injectable } from '@nestjs/common'
import { AppError } from '../../../shared/domain/errors'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { WorkspaceRepository } from '../../workspaces/domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../../workspaces/workspaces.tokens'
import type { TasksRepository } from '../domain/tasks.repository'
import type { TaskPriority, TaskStatus } from '../tasks.constants'
import { TASKS_REPOSITORY } from '../tasks.tokens'
import { serializeTask } from './serialize-task'

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASKS_REPOSITORY)
    private readonly tasks: TasksRepository,
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    assigneeId?: string | null
    dueDate?: string | null
  }) {
    await this.access.requireMember(input.workspaceId, input.actorId)
    await assertAssignee(this.workspaces, input.workspaceId, input.assigneeId)
    const task = await this.tasks.create({
      workspaceId: input.workspaceId,
      title: input.title.trim(),
      description: (input.description ?? '').trim(),
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      createdBy: input.actorId
    })
    return serializeTask(task)
  }
}

export async function assertAssignee(
  workspaces: WorkspaceRepository,
  workspaceId: string,
  assigneeId: string | null | undefined
): Promise<void> {
  if (!assigneeId) {
    return
  }
  const membership = await workspaces.getMembership(workspaceId, assigneeId)
  if (!membership) {
    throw new AppError(
      'Assignee must be a member of this workspace',
      400,
      'VALIDATION'
    )
  }
}
