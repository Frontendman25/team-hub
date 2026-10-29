import { describe, expect, it } from 'vitest'
import type { Task } from '@/shared/types/api'
import { applyMove, dropIndex, matchesFilters } from './board-layout'

function task(
  id: string,
  status: Task['status'],
  position: number,
  extra: Partial<Task> = {}
): Task {
  return {
    id,
    workspaceId: 'ws',
    title: id,
    description: '',
    status,
    priority: 'medium',
    position,
    assigneeId: extra.assigneeId ?? null,
    dueDate: null,
    createdBy: 'u1',
    version: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    creator: {
      id: 'u1',
      displayName: 'Sarah',
      jobTitle: '',
      avatarUrl: null
    },
    assignee: null,
    ...extra
  }
}

describe('applyMove', () => {
  it('reorders within a column and keeps other columns intact', () => {
    const board = [
      task('a', 'todo', 0),
      task('b', 'todo', 1),
      task('c', 'todo', 2),
      task('d', 'done', 0)
    ]
    const next = applyMove(board, 'c', 'todo', 0)
    expect(
      next
        .filter((row) => row.status === 'todo')
        .sort((left, right) => left.position - right.position)
        .map((row) => row.id)
    ).toEqual(['c', 'a', 'b'])
    expect(next.find((row) => row.id === 'd')?.position).toBe(0)
  })

  it('moves a card into another column at a clamped index', () => {
    const board = [task('a', 'todo', 0), task('b', 'in_progress', 0)]
    const next = applyMove(board, 'a', 'in_progress', 99)
    const progress = next
      .filter((row) => row.status === 'in_progress')
      .sort((left, right) => left.position - right.position)
    expect(progress.map((row) => row.id)).toEqual(['b', 'a'])
    expect(next.filter((row) => row.status === 'todo')).toHaveLength(0)
  })
})

describe('dropIndex', () => {
  it('appends when dropping on the column itself', () => {
    expect(dropIndex([task('a', 'todo', 0)], 'todo', 'todo')).toBe(1)
    expect(dropIndex([task('a', 'todo', 0)], 'a', 'todo')).toBe(0)
  })
})

describe('matchesFilters', () => {
  it('filters unassigned, priority, and status', () => {
    const assigned = task('a', 'todo', 0, { assigneeId: 'u2', priority: 'high' })
    expect(
      matchesFilters(assigned, {
        assigneeId: 'unassigned',
        priority: '',
        status: ''
      })
    ).toBe(false)
    expect(
      matchesFilters(assigned, {
        assigneeId: 'u2',
        priority: 'high',
        status: 'todo'
      })
    ).toBe(true)
  })
})

describe('optimistic rollback snapshot', () => {
  it('restores the previous board when a move fails', () => {
    const previous = [task('a', 'todo', 0), task('b', 'todo', 1)]
    const optimistic = applyMove(previous, 'a', 'done', 0)
    expect(optimistic.find((row) => row.id === 'a')?.status).toBe('done')
    const rolledBack = previous
    expect(rolledBack.find((row) => row.id === 'a')?.status).toBe('todo')
    expect(rolledBack.map((row) => row.position)).toEqual([0, 1])
  })
})
