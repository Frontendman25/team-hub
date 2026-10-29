'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { conversationKeys } from '@/entities/conversation/api/queries'
import { userQueries } from '@/entities/user/api/queries'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import type { Conversation } from '@/shared/types/api'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

export function WorkspaceMembers({
  workspaceId,
  slug
}: {
  workspaceId: string
  slug: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const members = useQuery(workspaceQueries.members(workspaceId))
  const me = useQuery(userQueries.me())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canMessage = Boolean(me.data)

  async function message(userId: string) {
    setPendingId(userId)
    setError(null)
    try {
      const conversation = await api.messaging.openDm(workspaceId, userId)
      queryClient.setQueryData<Conversation[]>(
        conversationKeys.list(workspaceId),
        (current) => upsertConversation(current, conversation)
      )
      await queryClient.invalidateQueries({
        queryKey: conversationKeys.list(workspaceId)
      })
      router.push(`/w/${slug}/messages/${conversation.id}`)
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not open a conversation'
      )
      setPendingId(null)
    }
  }

  if (members.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    )
  }

  if (members.isError) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-sm">
        <p className="text-red-600">Could not load members.</p>
        <Button className="mt-3" onClick={() => void members.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const items = members.data ?? []

  return (
    <section className="rounded-2xl border border-border bg-white p-2 shadow-sm">
      {error ? <p className="px-3 py-2 text-sm text-red-600">{error}</p> : null}
      <ul className="divide-y divide-border">
        {items.map((member) => {
          const self = member.userId === me.data?.id
          return (
            <li
              key={member.userId}
              className="flex items-center gap-3 rounded-xl px-3 py-3"
            >
              <Link
                href={`/users/${member.userId}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar
                  name={member.displayName}
                  src={member.avatarUrl}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{member.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.jobTitle}
                  </p>
                </div>
              </Link>
              <span className="text-xs capitalize text-muted-foreground">
                {member.role}
              </span>
              {canMessage && !self ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={pendingId === member.userId}
                  onClick={() => void message(member.userId)}
                >
                  {pendingId === member.userId ? 'Opening…' : 'Message'}
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function upsertConversation(
  current: Conversation[] | undefined,
  conversation: Conversation
): Conversation[] {
  if (!current) {
    return [conversation]
  }
  if (!current.some((row) => row.id === conversation.id)) {
    return [conversation, ...current]
  }
  return current.map((row) => (row.id === conversation.id ? conversation : row))
}
