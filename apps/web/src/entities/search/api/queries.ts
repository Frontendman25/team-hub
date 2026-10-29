import { api } from '@/shared/api/client'
import type { SearchHit, SearchKind } from '@/shared/types/api'

export const searchKeys = {
  all: ['search'] as const,
  workspace: (
    workspaceId: string,
    q: string,
    kinds?: SearchKind[]
  ) => [...searchKeys.all, workspaceId, q, kinds?.join(',') ?? 'all'] as const
}

export const searchQueries = {
  workspace: (
    workspaceId: string,
    q: string,
    kinds?: SearchKind[]
  ) => ({
    queryKey: searchKeys.workspace(workspaceId, q, kinds),
    queryFn: async (): Promise<SearchHit[]> => {
      const result = await api.search.workspace(workspaceId, q, {
        kinds,
        limit: 24
      })
      return result.data
    },
    enabled: q.trim().length > 0 && workspaceId.length > 0,
    staleTime: 15_000
  })
}
