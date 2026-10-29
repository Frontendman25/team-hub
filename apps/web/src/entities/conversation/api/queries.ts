import { api } from '@/shared/api/client'
import type { ChatMessage, Conversation } from '@/shared/types/api'

export const conversationKeys = {
  all: ['conversations'] as const,
  list: (workspaceId: string) =>
    [...conversationKeys.all, 'list', workspaceId] as const,
  messages: (conversationId: string) =>
    [...conversationKeys.all, 'messages', conversationId] as const,
  presence: (workspaceId: string) =>
    ['presence', workspaceId] as const,
  search: (workspaceId: string, q: string) =>
    ['message-search', workspaceId, q] as const
}

export const conversationQueries = {
  list: (workspaceId: string) => ({
    queryKey: conversationKeys.list(workspaceId),
    queryFn: async (): Promise<Conversation[]> => {
      const result = await api.messaging.conversations(workspaceId)
      return result.data
    }
  }),
  presence: (workspaceId: string) => ({
    queryKey: conversationKeys.presence(workspaceId),
    queryFn: (): Promise<{ userIds: string[] }> =>
      api.messaging.presence(workspaceId)
  }),
  search: (workspaceId: string, q: string) => ({
    queryKey: conversationKeys.search(workspaceId, q),
    queryFn: async (): Promise<ChatMessage[]> => {
      const result = await api.messaging.search(workspaceId, q)
      return result.data
    },
    enabled: q.trim().length > 0
  })
}

export const messageQueries = {
  infinite: (conversationId: string) => ({
    queryKey: conversationKeys.messages(conversationId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api.messaging.messages(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: { nextCursor: string | null }) =>
      lastPage.nextCursor ?? undefined
  })
}
