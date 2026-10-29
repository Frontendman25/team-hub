import { api } from '@/shared/api/client'
import type {
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember
} from '@/shared/types/api'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  detail: (ref: string) => [...workspaceKeys.all, 'detail', ref] as const,
  members: (id: string) => [...workspaceKeys.all, 'members', id] as const,
  invitations: (id: string) => [...workspaceKeys.all, 'invites', id] as const,
  mine: ['invitations', 'mine'] as const
}

export const workspaceQueries = {
  list: () => ({
    queryKey: workspaceKeys.list(),
    queryFn: async (): Promise<Workspace[]> => {
      const result = await api.workspaces.list()
      return result.data
    }
  }),
  detail: (ref: string) => ({
    queryKey: workspaceKeys.detail(ref),
    queryFn: (): Promise<Workspace> => api.workspaces.get(ref)
  }),
  members: (id: string) => ({
    queryKey: workspaceKeys.members(id),
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const result = await api.workspaces.members(id)
      return result.data
    }
  }),
  invitations: (id: string) => ({
    queryKey: workspaceKeys.invitations(id),
    queryFn: async (): Promise<WorkspaceInvitation[]> => {
      const result = await api.workspaces.invitations(id)
      return result.data
    }
  }),
  mine: () => ({
    queryKey: workspaceKeys.mine,
    queryFn: async (): Promise<WorkspaceInvitation[]> => {
      const result = await api.invitations.list()
      return result.data
    }
  })
}
