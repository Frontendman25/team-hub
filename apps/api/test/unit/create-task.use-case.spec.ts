import { describe, expect, it, vi } from 'vitest'
import { CreateTaskUseCase } from '../../src/modules/tasks/application/create-task.use-case'
import type { TaskRecord } from '../../src/modules/tasks/domain/task.record'
import type { TasksRepository } from '../../src/modules/tasks/domain/tasks.repository'
import type { WorkspaceAccess } from '../../src/modules/workspaces/application/workspace-access'
import type { WorkspaceRepository } from '../../src/modules/workspaces/domain/workspace.repository'
import { AppError } from '../../src/shared/domain/errors'

const actorId = '11111111-1111-4111-8111-111111111111'
const workspaceId = '88888888-8888-4888-8888-888888888888'
const outsider = '99999999-9999-4999-8999-999999999999'

function makeTask(): TaskRecord {
  return {
    id: 'b0a0d000-0000-4000-8000-000000000099',
    workspaceId,
    title: 'Ship board',
    description: '',
    status: 'todo',
    priority: 'medium',
    position: 0,
    assigneeId: null,
    dueDate: null,
    createdBy: actorId,
    version: 1,
    createdAt: new Date('2026-10-29T10:00:00.000Z'),
    updatedAt: new Date('2026-10-29T10:00:00.000Z'),
    creator: {
      id: actorId,
      displayName: 'Sarah Chen',
      jobTitle: 'Product Team',
      avatarUrl: null
    },
    assignee: null
  }
}

describe('CreateTaskUseCase', () => {
  it('creates a task for a workspace member', async () => {
    const created = makeTask()
    const tasks = {
      create: vi.fn().mockResolvedValue(created)
    } as unknown as TasksRepository
    const workspaces = {
      getMembership: vi.fn()
    } as unknown as WorkspaceRepository
    const access = {
      requireMember: vi.fn().mockResolvedValue({ role: 'member' })
    } as unknown as WorkspaceAccess
    const useCase = new CreateTaskUseCase(tasks, workspaces, access)
    const result = await useCase.execute({
      workspaceId,
      actorId,
      title: 'Ship board'
    })
    expect(access.requireMember).toHaveBeenCalledWith(workspaceId, actorId)
    expect(result.title).toBe('Ship board')
    expect(result.position).toBe(0)
  })

  it('rejects an assignee who is not a workspace member', async () => {
    const tasks = { create: vi.fn() } as unknown as TasksRepository
    const workspaces = {
      getMembership: vi.fn().mockResolvedValue(null)
    } as unknown as WorkspaceRepository
    const access = {
      requireMember: vi.fn().mockResolvedValue({ role: 'member' })
    } as unknown as WorkspaceAccess
    const useCase = new CreateTaskUseCase(tasks, workspaces, access)
    await expect(
      useCase.execute({
        workspaceId,
        actorId,
        title: 'Bad assign',
        assigneeId: outsider
      })
    ).rejects.toBeInstanceOf(AppError)
    expect(tasks.create).not.toHaveBeenCalled()
  })
})
