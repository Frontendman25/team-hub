import { Inject, Injectable } from '@nestjs/common'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type {
  ListTasksQuery,
  TasksRepository
} from '../domain/tasks.repository'
import { TASKS_REPOSITORY } from '../tasks.tokens'
import { serializeTask } from './serialize-task'

@Injectable()
export class ListTasksUseCase {
  constructor(
    @Inject(TASKS_REPOSITORY)
    private readonly tasks: TasksRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(query: ListTasksQuery & { actorId: string }) {
    await this.access.requireMember(query.workspaceId, query.actorId)
    const rows = await this.tasks.list(query)
    return rows.map(serializeTask)
  }
}
