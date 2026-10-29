'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { postKeys } from '@/entities/post/api/queries'
import { api } from '@/shared/api/client'
import { cn } from '@/shared/lib/cn'
import type { Post } from '@/shared/types/api'

export function ReactionButton({
  post,
  canReact
}: {
  post: Post
  canReact: boolean
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      post.viewerHasReacted
        ? api.reactions.remove(post.id)
        : api.reactions.add(post.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
    }
  })

  return (
    <button
      type="button"
      disabled={!canReact || mutation.isPending}
      onClick={() => {
        if (!canReact) {
          return
        }
        mutation.mutate()
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm hover:bg-muted',
        post.viewerHasReacted && 'text-rose-600'
      )}
    >
      <Heart
        className="size-4"
        fill={post.viewerHasReacted ? 'currentColor' : 'none'}
      />
      {post.reactionsCount}
    </button>
  )
}
