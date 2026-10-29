'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { workspaceKeys } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'

const schema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().trim().email('Enter a valid email'),
        role: z.enum(['admin', 'member'])
      })
    )
    .min(1)
})

type FormValues = z.infer<typeof schema>

export function InviteMembersForm({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invites: [{ email: '', role: 'member' }]
    }
  })
  const fields = useFieldArray({ control: form.control, name: 'invites' })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.workspaces.invite(workspaceId, values.invites),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(workspaceId)
      })
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.list()
      })
      if (result.errors.length === 0) {
        form.reset({ invites: [{ email: '', role: 'member' }] })
        return
      }
      applyInviteFieldErrors(form.setError, result.errors)
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        return
      }
      applyInviteFieldErrors(form.setError, extractInviteErrors(error.body))
    }
  })

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Invite people</p>
        <button
          type="button"
          className="text-xs font-medium"
          onClick={() => fields.append({ email: '', role: 'member' })}
        >
          Add another
        </button>
      </div>
      {fields.fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-2 sm:flex-row">
          <input
            className="h-10 flex-1 rounded-lg border border-border px-3"
            placeholder="colleague@company.com"
            {...form.register(`invites.${index}.email`)}
          />
          <select
            className="h-10 rounded-lg border border-border px-2"
            {...form.register(`invites.${index}.role`)}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          {fields.fields.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              onClick={() => fields.remove(index)}
            >
              Remove
            </Button>
          ) : null}
          {form.formState.errors.invites?.[index]?.email ? (
            <p className="w-full text-sm text-red-600 sm:col-span-2">
              {form.formState.errors.invites[index]?.email?.message}
            </p>
          ) : null}
        </div>
      ))}
      {mutation.error instanceof ApiError ? (
        <p className="text-sm text-red-600">{mutation.error.message}</p>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Sending…' : 'Send invitations'}
      </Button>
    </form>
  )
}

type InviteFieldError = { index: number; email: string; message: string }

function extractInviteErrors(body: unknown): InviteFieldError[] {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('details' in body) ||
    typeof body.details !== 'object' ||
    body.details === null ||
    !('errors' in body.details) ||
    !Array.isArray(body.details.errors)
  ) {
    return []
  }
  return body.details.errors.filter(
    (row): row is InviteFieldError =>
      typeof row === 'object' &&
      row !== null &&
      'index' in row &&
      'message' in row &&
      typeof row.index === 'number' &&
      typeof row.message === 'string'
  )
}

function applyInviteFieldErrors(
  setError: ReturnType<typeof useForm<FormValues>>['setError'],
  errors: InviteFieldError[]
) {
  errors.forEach((error) => {
    setError(`invites.${error.index}.email`, {
      type: 'server',
      message: error.message
    })
  })
}
