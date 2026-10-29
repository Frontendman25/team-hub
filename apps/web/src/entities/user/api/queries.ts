import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import type { FeedStats, PublicUser } from '@/shared/types/api'

export const userKeys = {
  me: ['users', 'me'] as const,
  list: ['users', 'list'] as const,
  detail: (id: string) => ['users', id] as const
}

async function fetchMe(): Promise<PublicUser | null> {
  try {
    return await api.users.me()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

export const userQueries = {
  me: () => ({
    queryKey: userKeys.me,
    queryFn: fetchMe,
    retry: false
  }),
  list: () => ({
    queryKey: userKeys.list,
    queryFn: (): Promise<PublicUser[]> => api.users.list()
  }),
  detail: (id: string) => ({
    queryKey: userKeys.detail(id),
    queryFn: (): Promise<PublicUser> => api.users.get(id)
  })
}

export const statsQuery = (workspaceId: string) => ({
  queryKey: ['stats', workspaceId] as const,
  queryFn: (): Promise<FeedStats> => api.stats(workspaceId),
  enabled: Boolean(workspaceId)
})
