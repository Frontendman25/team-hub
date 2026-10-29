import { describe, expect, it, vi } from 'vitest'
import { MoveTaskUseCase } from '../../src/modules/tasks/application/move-task.use-case'
import type { TaskRecord } from '../../src/modules/tasks/domain/task.record'
import type { TasksRepository } from '../../src/modules/tasks/domain/tasks.repository'
import type { WorkspaceAccess } from '../../src/modules/workspaces/application/workspace-access'
import { ConflictError } from '../../src/shared/domain/errors'

const actorId = '11111111-1111-4111-8111-111111111111'
const workspaceId = '88888888-8888-4888-8888-888888888888'

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'b0a0d000-0000-4000-8000-000000000098',
    workspaceId,
    title: 'Move me',
    description: '',
    status: 'todo',
    priority: 'low',
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
      jobTitle: '',
      avatarUrl: null
    },
    assignee: null,
    ...overrides
  }
}

describe('MoveTaskUseCase', () => {
  it('returns conflict when the version is stale', async () => {
    const current = makeTask()
    const tasks = {
      findById: vi.fn().mockResolvedValue(current),
      move: vi.fn().mockResolvedValue({ ok: false, reason: 'stale' })
    } as unknown as TasksRepository
    const access = {
      requireMember: vi.fn().mockResolvedValue({ role: 'member' })
    } as unknown as WorkspaceAccess
    const demo = {
      assertOwnInDemo: vi.fn().mockResolvedValue(undefined)
    }
    const useCase = new MoveTaskUseCase(tasks, access, demo as never)
    await expect(
      useCase.execute({
        taskId: current.id,
        actorId,
        status: 'done',
        position: 0,
        expectedVersion: 1
      })
    ).rejects.toBeInstanceOf(ConflictError)
  })
})
