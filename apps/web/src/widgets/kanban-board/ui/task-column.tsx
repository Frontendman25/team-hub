'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { Task, TaskStatus } from '@/shared/types/api'
import { TaskCard } from './task-card'

export function TaskColumn({
  status,
  title,
  tasks,
  onOpen,
  onCreate
}: {
  status: TaskStatus
  title: string
  tasks: Task[]
  onOpen: (task: Task) => void
  onCreate: (status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status }
  })

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[28rem] min-w-[17rem] flex-1 flex-col rounded-2xl border border-border bg-muted/40 p-3 ${
        isOver ? 'bg-accent/30' : ''
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{tasks.length}</p>
        </div>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-foreground"
          aria-label={`Add task to ${title}`}
          onClick={() => onCreate(status)}
        >
          <Plus className="size-4" />
        </button>
      </header>
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              No cards here yet.
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  )
}
