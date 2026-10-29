'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, GripVertical } from 'lucide-react'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/cn'
import type { Task, TaskPriority } from '@/shared/types/api'

const priorityClass: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-50 text-amber-800',
  high: 'bg-red-50 text-red-700'
}

export function TaskCard({
  task,
  onOpen
}: {
  task: Task
  onOpen: (task: Task) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { status: task.status } })

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        'rounded-xl border border-border bg-white p-3 shadow-sm',
        isDragging && 'z-10 opacity-80 shadow-md'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label={`Drag ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(task)}
        >
          <p className="text-sm font-semibold">{task.title}</p>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          ) : null}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
            priorityClass[task.priority]
          )}
        >
          {task.priority}
        </span>
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3" />
            {task.dueDate}
          </span>
        ) : null}
        {task.assignee ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Avatar
              name={task.assignee.displayName}
              src={task.assignee.avatarUrl}
              size={18}
            />
            {task.assignee.displayName}
          </span>
        ) : (
          <span className="ml-auto text-[11px] text-muted-foreground">
            Unassigned
          </span>
        )}
      </div>
    </article>
  )
}
