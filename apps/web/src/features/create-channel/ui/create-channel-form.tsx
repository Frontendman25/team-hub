'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { conversationKeys } from '@/entities/conversation/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80),
  topic: z.string().trim().max(500).optional()
})

type FormValues = z.infer<typeof schema>

export function CreateChannelForm({
  workspaceId,
  slug,
  onCreated,
  onCancel
}: {
  workspaceId: string
  slug: string
  onCreated?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', topic: '' }
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.messaging.createChannel(workspaceId, values),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({
        queryKey: conversationKeys.list(workspaceId)
      })
      onCreated?.()
      router.push(`/w/${slug}/messages/${conversation.id}`)
    }
  })

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel?.()
        }
      }}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Channel name</span>
        <input
          className="h-10 w-full rounded-lg border border-border px-3"
          placeholder="engineering"
          {...form.register('name')}
        />
        {form.formState.errors.name ? (
          <p className="text-sm text-red-600">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Topic</span>
        <input
          className="h-10 w-full rounded-lg border border-border px-3"
          {...form.register('topic')}
        />
      </label>
      {mutation.error instanceof ApiError ? (
        <p className="text-sm text-red-600">{mutation.error.message}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create channel'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
