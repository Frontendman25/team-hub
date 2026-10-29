'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postKeys } from '@/entities/post/api/queries'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'

export function DeletePostButton({ postId }: { postId: string }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api.posts.remove(postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
    }
  })

  return (
    <Button
      variant="danger"
      className="h-8 px-2 text-xs"
      onClick={() => {
        if (confirm('Delete this post?')) {
          mutation.mutate()
        }
      }}
    >
      Delete
    </Button>
  )
}
