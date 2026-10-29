import { api } from '@/shared/api/client'
import type { PaginatedPosts, Post } from '@/shared/types/api'

export const FEED_PAGE_SIZE = 10

export const postKeys = {
  all: ['posts'] as const,
  list: (workspaceId?: string, authorId?: string) =>
    [...postKeys.all, 'list', workspaceId ?? 'none', authorId ?? 'all'] as const,
  infinite: (workspaceId?: string, authorId?: string) =>
    [
      ...postKeys.all,
      'infinite',
      workspaceId ?? 'none',
      authorId ?? 'all'
    ] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const
}

export const postQueries = {
  list: (workspaceId: string, authorId?: string) => ({
    queryKey: postKeys.list(workspaceId, authorId),
    queryFn: (): Promise<PaginatedPosts> =>
      api.posts.list({ workspaceId, authorId, limit: FEED_PAGE_SIZE }),
    enabled: Boolean(workspaceId)
  }),
  infinite: (workspaceId: string, authorId?: string) => ({
    queryKey: postKeys.infinite(workspaceId, authorId),
    queryFn: ({ pageParam }: { pageParam: number }): Promise<PaginatedPosts> =>
      api.posts.list({
        workspaceId,
        authorId,
        limit: FEED_PAGE_SIZE,
        offset: pageParam
      }),
    initialPageParam: 0,
    getNextPageParam: (
      lastPage: PaginatedPosts,
      allPages: PaginatedPosts[]
    ) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0)
      return loaded < lastPage.pagination.total ? loaded : undefined
    },
    enabled: Boolean(workspaceId)
  }),
  detail: (id: string) => ({
    queryKey: postKeys.detail(id),
    queryFn: (): Promise<Post> => api.posts.get(id)
  })
}
