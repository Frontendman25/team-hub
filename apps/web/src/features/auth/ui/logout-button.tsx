'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/shared/api/client'
import { clearViewerQueries } from '@/shared/lib/session-cache'
import { Button } from '@/shared/ui/button'

export function LogoutButton() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: async () => {
      await clearViewerQueries(queryClient)
      router.push('/login')
      router.refresh()
    }
  })

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-8 px-2 text-xs"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      Sign out
    </Button>
  )
}
