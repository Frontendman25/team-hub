import { api } from '@/shared/api/client'
import type { Comment } from '@/shared/types/api'

export const commentKeys = {
  byPost: (postId: string) => ['comments', postId] as const
}

export const commentQueries = {
  byPost: (postId: string) => ({
    queryKey: commentKeys.byPost(postId),
    queryFn: (): Promise<Comment[]> => api.comments.list(postId)
  })
}
