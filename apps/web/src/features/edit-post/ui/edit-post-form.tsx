'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { postKeys } from '@/entities/post/api/queries'
import { api } from '@/shared/api/client'
import { useUiStore } from '@/shared/model/ui-store'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

const schema = z.object({
  content: z.string().trim().min(1).max(5000)
})

export function EditPostForm({
  postId,
  initialContent
}: {
  postId: string
  initialContent: string
}) {
  const queryClient = useQueryClient()
  const setEditingPostId = useUiStore((state) => state.setEditingPostId)
  const [content, setContent] = useState(initialContent)

  const mutation = useMutation({
    mutationFn: () => api.posts.update(postId, { content }),
    onSuccess: async () => {
      setEditingPostId(null)
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
    }
  })

  return (
    <div className="space-y-2">
      <Textarea
        rows={4}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <div className="flex gap-2">
        <Button
          onClick={() => {
            const parsed = schema.safeParse({ content })
            if (!parsed.success) {
              return
            }
            if (parsed.data.content === initialContent.trim()) {
              setEditingPostId(null)
              return
            }
            mutation.mutate()
          }}
          disabled={mutation.isPending}
        >
          Save
        </Button>
        <Button
          variant="outline"
          onClick={() => setEditingPostId(null)}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
