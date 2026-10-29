'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commentKeys } from '@/entities/comment/api/queries'
import { postKeys } from '@/entities/post/api/queries'
import { api } from '@/shared/api/client'

export function DeleteCommentButton({
  commentId,
  postId
}: {
  commentId: string
  postId: string
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api.comments.remove(commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: commentKeys.byPost(postId)
      })
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
    }
  })

  return (
    <button
      type="button"
      className="text-xs text-muted-foreground hover:text-red-600"
      onClick={() => mutation.mutate()}
    >
      Delete
    </button>
  )
}
