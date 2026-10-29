'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { commentKeys } from '@/entities/comment/api/queries'
import { postKeys } from '@/entities/post/api/queries'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Avatar } from '@/shared/ui/avatar'
import type { PublicUser } from '@/shared/types/api'

const schema = z.object({
  content: z.string().trim().min(1).max(2000)
})

export function CommentForm({
  postId,
  me
}: {
  postId: string
  me: PublicUser
}) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.comments.create(postId, content),
    onSuccess: async () => {
      setContent('')
      await queryClient.invalidateQueries({
        queryKey: commentKeys.byPost(postId)
      })
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
    }
  })

  return (
    <div className="flex gap-3">
      <Avatar name={me.displayName} src={me.avatarUrl} size={32} />
      <div className="flex-1 space-y-2">
        <Textarea
          rows={2}
          placeholder="Write a comment…"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <Button
          className="h-8"
          disabled={mutation.isPending}
          onClick={() => {
            if (schema.safeParse({ content }).success) {
              mutation.mutate()
            }
          }}
        >
          Comment
        </Button>
      </div>
    </div>
  )
}
