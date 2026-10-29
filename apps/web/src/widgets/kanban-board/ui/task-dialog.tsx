'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import type { Task, TaskPriority, WorkspaceMember } from '@/shared/types/api'

export function TaskDialog({
  task,
  members,
  saving,
  error,
  canDelete,
  onClose,
  onSave,
  onDelete
}: {
  task: Task
  members: WorkspaceMember[]
  saving: boolean
  error: string | null
  canDelete: boolean
  onClose: () => void
  onSave: (input: {
    title: string
    description: string
    priority: TaskPriority
    assigneeId: string | null
    dueDate: string | null
  }) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-16">
      <div
        role="dialog"
        aria-labelledby="task-dialog-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-lg"
      >
        <h2 id="task-dialog-title" className="text-lg font-semibold">
          Task details
        </h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSave({
              title: title.trim(),
              description: description.trim(),
              priority,
              assigneeId: assigneeId || null,
              dueDate: dueDate || null
            })
          }}
        >
          <label className="block text-sm">
            Title
            <input
              className="mt-1 h-10 w-full rounded-lg border border-border px-3"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-border px-3 py-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={4000}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Priority
              <select
                className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block text-sm">
              Due date
              <input
                type="date"
                className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            Assignee
            <select
              className="mt-1 h-10 w-full rounded-lg border border-border px-3"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            {canDelete ? (
              <Button
                type="button"
                variant="danger"
                className="ml-auto"
                disabled={saving}
                onClick={onDelete}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateTaskDialog({
  statusLabel,
  members,
  saving,
  error,
  onClose,
  onCreate
}: {
  statusLabel: string
  members: WorkspaceMember[]
  saving: boolean
  error: string | null
  onClose: () => void
  onCreate: (input: {
    title: string
    description: string
    priority: TaskPriority
    assigneeId: string | null
    dueDate: string | null
  }) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-16">
      <div
        role="dialog"
        aria-labelledby="create-task-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-lg"
      >
        <h2 id="create-task-title" className="text-lg font-semibold">
          New card · {statusLabel}
        </h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            onCreate({
              title: title.trim(),
              description: description.trim(),
              priority,
              assigneeId: assigneeId || null,
              dueDate: dueDate || null
            })
          }}
        >
          <label className="block text-sm">
            Title
            <input
              className="mt-1 h-10 w-full rounded-lg border border-border px-3"
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            Description
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-border px-3 py-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Priority
              <select
                className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block text-sm">
              Due date
              <input
                type="date"
                className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            Assignee
            <select
              className="mt-1 h-10 w-full rounded-lg border border-border px-3"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
