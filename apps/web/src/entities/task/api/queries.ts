import { api } from '@/shared/api/client'
import type { Task } from '@/shared/types/api'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (workspaceId: string) => [...taskKeys.all, 'list', workspaceId] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const
}

export const taskQueries = {
  list: (workspaceId: string) => ({
    queryKey: taskKeys.list(workspaceId),
    queryFn: async (): Promise<Task[]> => {
      const result = await api.tasks.list(workspaceId)
      return result.data
    }
  }),
  detail: (id: string) => ({
    queryKey: taskKeys.detail(id),
    queryFn: (): Promise<Task> => api.tasks.get(id)
  })
}
