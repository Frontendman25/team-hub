'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { statsQuery, userQueries } from '@/entities/user/api/queries'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { useCurrentWorkspace } from '@/entities/workspace/model/use-current-workspace'
import { Avatar } from '@/shared/ui/avatar'

const PREVIEW_COUNT = 5
const STACK_COUNT = 3

export function RightSidebar() {
  const me = useQuery(userQueries.me())
  const { current } = useCurrentWorkspace()
  const members = useQuery({
    ...workspaceQueries.members(current?.id ?? ''),
    enabled: Boolean(current?.id)
  })
  const stats = useQuery(statsQuery(current?.id ?? ''))
  const others = (members.data ?? []).filter(
    (member) => member.userId !== me.data?.id
  )
  const preview = others.slice(0, PREVIEW_COUNT)
  const remaining = Math.max(others.length - preview.length, 0)
  const stack = others.slice(PREVIEW_COUNT, PREVIEW_COUNT + STACK_COUNT)
  const membersHref = current ? `/w/${current.slug}/members` : '/login'
  const total = members.data?.length ?? stats.data?.users ?? 0

  return (
    <aside className="hidden w-72 shrink-0 space-y-4 xl:block">
      {me.data ? (
        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            You
          </p>
          <Link href="/profile" className="mt-3 flex items-center gap-3">
            <Avatar name={me.data.displayName} src={me.data.avatarUrl} />
            <div>
              <p className="font-semibold">{me.data.displayName}</p>
              <p className="text-sm text-muted-foreground">{me.data.jobTitle}</p>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Members
          </p>
          <Link
            href={membersHref}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {total}
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {preview.map((member) => (
            <li key={member.userId}>
              <Link
                href={`/users/${member.userId}`}
                className="flex items-center gap-3"
              >
                <Avatar
                  name={member.displayName}
                  src={member.avatarUrl}
                  size={32}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.jobTitle || member.role}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {remaining > 0 ? (
          <Link
            href={membersHref}
            className="mt-3 flex items-center gap-2 rounded-xl px-1 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="flex -space-x-2">
              {stack.map((member) => (
                <Avatar
                  key={member.userId}
                  name={member.displayName}
                  src={member.avatarUrl}
                  size={24}
                  className="ring-2 ring-white"
                />
              ))}
            </span>
            <span>
              +{remaining} more
            </span>
          </Link>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">People</dt>
            <dd className="text-lg font-semibold">{stats.data?.users ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Posts</dt>
            <dd className="text-lg font-semibold">{stats.data?.posts ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Comments</dt>
            <dd className="text-lg font-semibold">
              {stats.data?.comments ?? '—'}
            </dd>
          </div>
        </dl>
      </section>
    </aside>
  )
}
