'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { workspaceKeys } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().trim().max(500).optional()
})

type FormValues = z.infer<typeof schema>

export function CreateWorkspaceForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' }
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.workspaces.create(values),
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      document.cookie = `th.ws=${workspace.slug}; path=/; max-age=31536000; samesite=lax`
      router.push(`/w/${workspace.slug}`)
      router.refresh()
    }
  })

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Workspace name</span>
        <input
          className="h-10 w-full rounded-lg border border-border px-3"
          {...form.register('name')}
        />
        {form.formState.errors.name ? (
          <p className="text-sm text-red-600">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Description</span>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2"
          {...form.register('description')}
        />
      </label>
      {mutation.error instanceof ApiError ? (
        <p className="text-sm text-red-600">{mutation.error.message}</p>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating…' : 'Create workspace'}
      </Button>
    </form>
  )
}
