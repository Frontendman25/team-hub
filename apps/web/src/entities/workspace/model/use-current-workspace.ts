'use client'

import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { userQueries } from '@/entities/user/api/queries'
import type { Workspace } from '@/shared/types/api'
import { selectWorkspace } from './select-workspace'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null
}

export function useCurrentWorkspace(
  initialPreferredSlug: string | null = null
): {
  current: Workspace | null
  workspaces: Workspace[]
  isPending: boolean
  isError: boolean
  retry: () => void
} {
  const pathname = usePathname()
  const me = useQuery(userQueries.me())
  const list = useQuery({
    ...workspaceQueries.list(),
    enabled: Boolean(me.data)
  })
  const slugFromPath = pathname.startsWith('/w/')
    ? pathname.split('/')[2]
    : null
  const cookieSlug = useSyncExternalStore(
    () => () => undefined,
    () => readCookie('th.ws'),
    () => initialPreferredSlug
  )
  const current = selectWorkspace(list.data ?? [], slugFromPath, cookieSlug)

  return {
    current,
    workspaces: list.data ?? [],
    isPending: me.isPending || (Boolean(me.data) && list.isPending),
    isError: me.isError || (Boolean(me.data) && list.isError),
    retry: () => {
      void (me.isError ? me.refetch() : list.refetch())
    }
  }
}
