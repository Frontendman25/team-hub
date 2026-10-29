'use client'

import { useSyncExternalStore } from 'react'
import { formatRelativeTime } from '@/shared/lib/format'

function subscribe(): () => void {
  return () => undefined
}

export function RelativeTime({ iso }: { iso: string }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const label = mounted
    ? formatRelativeTime(iso)
    : new Date(iso).toISOString().slice(0, 10)

  return <span>{label}</span>
}
