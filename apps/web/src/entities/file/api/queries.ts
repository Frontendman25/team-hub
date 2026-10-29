import { api } from '@/shared/api/client'
import type { PaginatedFiles } from '@/shared/types/api'

export const fileKeys = {
  all: ['files'] as const,
  list: (workspaceId: string) => [...fileKeys.all, workspaceId] as const
}

export const fileQueries = {
  list: (workspaceId: string) => ({
    queryKey: fileKeys.list(workspaceId),
    queryFn: (): Promise<PaginatedFiles> => api.files.list(workspaceId)
  })
}
