'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { taskKeys, taskQueries } from '@/entities/task/api/queries'
import {
  BOARD_COLUMNS,
  applyMove,
  dropIndex,
  matchesFilters,
  tasksInColumn,
  type BoardFilters
} from '@/entities/task/model/board-layout'
import { userQueries } from '@/entities/user/api/queries'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { useRealtime } from '@/shared/lib/use-realtime'
import type { Task, TaskStatus, WorkspaceRole } from '@/shared/types/api'
import { TaskColumn } from './task-column'
import { CreateTaskDialog, TaskDialog } from './task-dialog'

export function KanbanBoard({
  workspaceId,
  role
}: {
  workspaceId: string
  role: WorkspaceRole
}) {
  const queryClient = useQueryClient()
  const board = useQuery(taskQueries.list(workspaceId))
  const members = useQuery(workspaceQueries.members(workspaceId))
  const me = useQuery(userQueries.me())
  useRealtime(workspaceId)
  const [filters, setFilters] = useState<BoardFilters>({
    assigneeId: '',
    priority: '',
    status: ''
  })
  const [selected, setSelected] = useState<Task | null>(null)
  const [creating, setCreating] = useState<TaskStatus | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const visible = useMemo(
    () => (board.data ?? []).filter((task) => matchesFilters(task, filters)),
    [board.data, filters]
  )

  const setBoard = (next: Task[]) => {
    queryClient.setQueryData(taskKeys.list(workspaceId), next)
  }

  const create = useMutation({
    mutationFn: (input: {
      title: string
      description: string
      priority: Task['priority']
      assigneeId: string | null
      dueDate: string | null
      status: TaskStatus
    }) =>
      api.tasks.create(workspaceId, {
        title: input.title,
        description: input.description,
        priority: input.priority,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate,
        status: input.status
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) })
      setCreating(null)
      setFormError(null)
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Could not create the task'
      )
    }
  })

  const update = useMutation({
    mutationFn: (input: {
      id: string
      version: number
      title: string
      description: string
      priority: Task['priority']
      assigneeId: string | null
      dueDate: string | null
    }) =>
      api.tasks.update(input.id, {
        version: input.version,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate
      }),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) })
      setSelected(task)
      setFormError(null)
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Could not save the task'
      )
    }
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.tasks.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(workspaceId) })
      setSelected(null)
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Could not delete the task'
      )
    }
  })

  const move = useMutation({
    mutationFn: (input: {
      id: string
      status: TaskStatus
      position: number
      version: number
    }) => api.tasks.move(input.id, input),
    onSuccess: (result) => {
      setBoard(result.data)
    }
  })

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !board.data) {
      return
    }
    const moving = board.data.find((task) => task.id === active.id)
    if (!moving) {
      return
    }
    const overStatus = (over.data.current?.status ??
      (typeof over.id === 'string' &&
      BOARD_COLUMNS.some((column) => column.status === over.id)
        ? over.id
        : moving.status)) as TaskStatus
    const column = tasksInColumn(
      visible.filter((task) => task.id !== moving.id),
      overStatus
    )
    const index = dropIndex(column, String(over.id), overStatus)
    if (moving.status === overStatus && moving.position === index) {
      return
    }
    const previous = board.data
    setBoard(applyMove(previous, moving.id, overStatus, index))
    move.mutate(
      {
        id: moving.id,
        status: overStatus,
        position: index,
        version: moving.version
      },
      { onError: () => setBoard(previous) }
    )
  }

  const canDelete = (task: Task) =>
    task.createdBy === me.data?.id || role === 'admin' || role === 'owner'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter by assignee"
          className="h-9 rounded-lg border border-border bg-white px-2 text-sm"
          value={filters.assigneeId}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              assigneeId: event.target.value
            }))
          }
        >
          <option value="">All people</option>
          <option value="unassigned">Unassigned</option>
          {(members.data ?? []).map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          className="h-9 rounded-lg border border-border bg-white px-2 text-sm"
          value={filters.priority}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              priority: event.target.value as BoardFilters['priority']
            }))
          }
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-border bg-white px-2 text-sm"
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value as BoardFilters['status']
            }))
          }
        >
          <option value="">All columns</option>
          {BOARD_COLUMNS.map((column) => (
            <option key={column.status} value={column.status}>
              {column.title}
            </option>
          ))}
        </select>
      </div>

      {board.isPending ? (
        <p className="text-sm text-muted-foreground">Loading the board…</p>
      ) : null}
      {board.isError ? (
        <p className="text-sm text-red-600">Could not load tasks.</p>
      ) : null}
      {board.data && board.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
          No tasks yet. Add a card to To Do to get started.
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((column) => (
            <TaskColumn
              key={column.status}
              status={column.status}
              title={column.title}
              tasks={tasksInColumn(visible, column.status)}
              onOpen={setSelected}
              onCreate={setCreating}
            />
          ))}
        </div>
      </DndContext>

      {selected ? (
        <TaskDialog
          key={selected.id + selected.version}
          task={selected}
          members={members.data ?? []}
          saving={update.isPending || remove.isPending}
          error={formError}
          canDelete={canDelete(selected)}
          onClose={() => {
            setSelected(null)
            setFormError(null)
          }}
          onSave={(input) =>
            update.mutate({
              id: selected.id,
              version: selected.version,
              ...input
            })
          }
          onDelete={() => remove.mutate(selected.id)}
        />
      ) : null}

      {creating ? (
        <CreateTaskDialog
          statusLabel={
            BOARD_COLUMNS.find((column) => column.status === creating)?.title ??
            creating
          }
          members={members.data ?? []}
          saving={create.isPending}
          error={formError}
          onClose={() => {
            setCreating(null)
            setFormError(null)
          }}
          onCreate={(input) =>
            create.mutate({
              ...input,
              status: creating
            })
          }
        />
      ) : null}
    </div>
  )
}
