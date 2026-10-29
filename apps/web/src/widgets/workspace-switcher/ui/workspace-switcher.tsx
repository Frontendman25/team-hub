'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCurrentWorkspace } from '@/entities/workspace/model/use-current-workspace'

export function WorkspaceSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { current, workspaces } = useCurrentWorkspace()

  if (workspaces.length === 0) {
    return null
  }

  return (
    <select
      aria-label="Current workspace"
      className="h-9 max-w-[10rem] rounded-full border border-border bg-white px-3 text-sm"
      value={current?.slug ?? ''}
      onChange={(event) => {
        const slug = event.target.value
        document.cookie = `th.ws=${slug}; path=/; max-age=31536000; samesite=lax`
        const stayOnMessages = pathname.includes('/messages')
        const stayOnBoard = pathname.includes('/board')
        router.push(
          stayOnMessages
            ? `/w/${slug}/messages`
            : stayOnBoard
              ? `/w/${slug}/board`
              : `/w/${slug}`
        )
      }}
    >
      {workspaces.map((workspace) => (
        <option key={workspace.id} value={workspace.slug}>
          {workspace.name}
        </option>
      ))}
    </select>
  )
}
