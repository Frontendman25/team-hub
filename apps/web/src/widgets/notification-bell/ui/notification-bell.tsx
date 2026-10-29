'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { notificationKeys, notificationQueries } from '@/entities/notification/api/queries'
import { api } from '@/shared/api/client'
import { cn } from '@/shared/lib/cn'
import type { AppNotification } from '@/shared/types/api'
import { Avatar } from '@/shared/ui/avatar'
import { RelativeTime } from '@/shared/ui/relative-time'

function labelFor(item: AppNotification): string {
  if (item.type === 'comment') {
    return `${item.actor.displayName} commented on your post`
  }
  if (item.type === 'invitation') {
    return `${item.actor.displayName} invited you to ${item.workspaceName ?? 'a workspace'}`
  }
  return `${item.actor.displayName} liked your post`
}

export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const unread = useQuery(notificationQueries.unreadCount(true))
  const list = useQuery(notificationQueries.list(open))
  const count = unread.data?.count ?? 0

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  }

  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })
      const previousCount = queryClient.getQueryData<UnreadCountSnapshot>(
        notificationKeys.unreadCount()
      )
      const previousList = queryClient.getQueryData<NotificationListSnapshot>(
        notificationKeys.list()
      )
      queryClient.setQueryData(
        notificationKeys.unreadCount(),
        (current: UnreadCountSnapshot | undefined) => {
          const wasUnread = previousList?.data.find((item) => item.id === id)
            ?.readAt === null
          if (!wasUnread) {
            return current
          }
          return { count: Math.max(0, (current?.count ?? 1) - 1) }
        }
      )
      queryClient.setQueryData(
        notificationKeys.list(),
        (current: NotificationListSnapshot | undefined) => {
          if (!current) {
            return current
          }
          return {
            data: current.data.map((item) =>
              item.id === id
                ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
                : item
            )
          }
        }
      )
      return { previousCount, previousList }
    },
    onError: (_error, _id, context) => {
      if (context?.previousCount) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(),
          context.previousCount
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(notificationKeys.list(), context.previousList)
      }
    },
    onSettled: invalidate
  })

  const markAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: invalidate
  })

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openItem = (item: AppNotification) => {
    if (!item.readAt) {
      markRead.mutate(item.id)
    }
    setOpen(false)
    if (item.type === 'invitation') {
      router.push('/invitations')
      return
    }
    if (!item.postDeleted && item.postId) {
      router.push(`/posts/${item.postId}`)
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-9 place-items-center rounded-full hover:bg-muted"
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={count === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all as read
            </button>
          </div>

          {list.isPending ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              Loading notifications…
            </p>
          ) : list.isError ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              Couldn’t load notifications. Try again in a moment.
            </p>
          ) : list.data?.data.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {list.data?.data.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      'flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/70',
                      !item.readAt && 'bg-accent/20'
                    )}
                  >
                    <Avatar
                      name={item.actor.displayName}
                      src={item.actor.avatarUrl}
                      size={36}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{labelFor(item)}</span>
                      {item.type === 'invitation' ? (
                        <span className="block text-xs text-muted-foreground">
                          Open invitations ·{' '}
                          <RelativeTime iso={item.createdAt} />
                        </span>
                      ) : item.postDeleted || !item.postId ? (
                        <span className="block text-xs text-muted-foreground">
                          This post is no longer available ·{' '}
                          <RelativeTime iso={item.createdAt} />
                        </span>
                      ) : (
                        <>
                          {item.postPreview ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {item.postPreview}
                            </span>
                          ) : null}
                          <span className="block text-xs text-muted-foreground">
                            <RelativeTime iso={item.createdAt} />
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

type UnreadCountSnapshot = { count: number }
type NotificationListSnapshot = { data: AppNotification[] }
