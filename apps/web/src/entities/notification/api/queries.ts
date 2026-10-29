import { api } from '@/shared/api/client'
import type { NotificationList, UnreadCount } from '@/shared/types/api'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const
}

export const notificationQueries = {
  list: (enabled: boolean) => ({
    queryKey: notificationKeys.list(),
    queryFn: (): Promise<NotificationList> => api.notifications.list(),
    enabled
  }),
  unreadCount: (enabled: boolean) => ({
    queryKey: notificationKeys.unreadCount(),
    queryFn: (): Promise<UnreadCount> => api.notifications.unreadCount(),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true
  })
}
