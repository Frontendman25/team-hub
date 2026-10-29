import type { QueryClient } from '@tanstack/react-query'
import { notificationKeys } from '@/entities/notification/api/queries'
import { postKeys } from '@/entities/post/api/queries'
import { userKeys } from '@/entities/user/api/queries'
import { conversationKeys } from '@/entities/conversation/api/queries'
import { workspaceKeys } from '@/entities/workspace/api/queries'

export async function invalidateViewerQueries(
  queryClient: QueryClient
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: userKeys.me }),
    queryClient.invalidateQueries({ queryKey: postKeys.all }),
    queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
    queryClient.invalidateQueries({ queryKey: conversationKeys.all })
  ])
}

export async function clearViewerQueries(
  queryClient: QueryClient
): Promise<void> {
  queryClient.setQueryData(userKeys.me, null)
  queryClient.removeQueries({ queryKey: notificationKeys.all })
  queryClient.removeQueries({ queryKey: workspaceKeys.all })
  queryClient.removeQueries({ queryKey: conversationKeys.all })
  await queryClient.invalidateQueries({ queryKey: postKeys.all })
}
