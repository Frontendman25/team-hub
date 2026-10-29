'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { invalidateViewerQueries } from '@/shared/lib/session-cache'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

export function TryDemoButton({
  className,
  label = 'Try Demo'
}: {
  className?: string
  label?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => api.auth.demo(),
    onSuccess: async () => {
      document.cookie = 'th.ws=teamhub; path=/; max-age=31536000; samesite=lax'
      await invalidateViewerQueries(queryClient)
      router.push('/w/teamhub')
      router.refresh()
    },
    onError: (cause) => {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not open the demo'
      )
    }
  })

  return (
    <div className={className}>
      <Button
        type="button"
        className={cn('w-full', className)}
        disabled={mutation.isPending}
        onClick={() => {
          setError(null)
          mutation.mutate()
        }}
      >
        {mutation.isPending ? 'Opening demo…' : label}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
