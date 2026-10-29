'use client'

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Hash,
  MessageCircle,
  Plus,
  Search,
  Send,
  WifiOff
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { conversationKeys, conversationQueries, messageQueries } from '@/entities/conversation/api/queries'
import { searchQueries } from '@/entities/search/api/queries'
import { SearchResults } from '@/features/search/ui/search-results'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
import { previewChannels } from '@/entities/conversation/model/preview-channels'
import { flattenMessagePages, markFailed, upsertMessage } from '@/entities/message/model/merge-messages'
import { userQueries } from '@/entities/user/api/queries'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { CreateChannelForm } from '@/features/create-channel/ui/create-channel-form'
import { MediaComposer } from '@/features/record-media/ui/media-composer'
import { FileDropzone } from '@/features/upload-files/ui/file-dropzone'
import { AttachmentGrid } from '@/features/upload-files/ui/attachment-card'
import {
  isAudioType,
  isVideoType,
  MAX_ATTACHMENTS
} from '@/features/upload-files/lib/file-rules'
import { uploadWorkspaceFile } from '@/features/upload-files/lib/upload-file'
import { fileKeys } from '@/entities/file/api/queries'
import { api } from '@/shared/api/client'
import { cn } from '@/shared/lib/cn'
import { useRealtime } from '@/shared/lib/use-realtime'
import type {
  ChatMessage,
  Conversation,
  FileAttachment,
  WorkspaceMember,
  WorkspaceRole
} from '@/shared/types/api'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'

const MEMBER_PREVIEW_COUNT = 5

function canEditMessageText(message: ChatMessage): boolean {
  const media = (message.attachments ?? []).some(
    (file) => isAudioType(file.contentType) || isVideoType(file.contentType)
  )
  if (!media) {
    return true
  }
  return message.content.trim().length > 0
}

export function Messenger({
  workspaceId,
  slug,
  conversationId,
  role,
  demoWorkspace = false
}: {
  workspaceId: string
  slug: string
  conversationId?: string
  role: WorkspaceRole
  demoWorkspace?: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const me = useQuery(userQueries.me())
  const members = useQuery(workspaceQueries.members(workspaceId))
  const list = useQuery(conversationQueries.list(workspaceId))
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [channelsExpanded, setChannelsExpanded] = useState(false)
  const debouncedQuery = useDebouncedValue(query.trim(), 250)
  const search = useQuery({
    ...searchQueries.workspace(workspaceId, debouncedQuery, [
      'message',
      'channel',
      'person'
    ]),
    enabled: debouncedQuery.length > 1
  })
  const realtime = useRealtime(workspaceId)
  const visitor = me.data?.accountKind !== 'demo_persona'
  const canManage =
    (!demoWorkspace || !visitor) && (role === 'owner' || role === 'admin')
  const conversations = list.data ?? []
  const active = conversations.find((row) => row.id === conversationId)
  const channels = conversations.filter((row) => row.type === 'channel')
  const dms = conversations.filter((row) => row.type === 'dm')
  const channelPreview = previewChannels(
    channels,
    channelsExpanded,
    conversationId
  )

  useEffect(() => {
    if (!conversationId && channels[0]) {
      router.replace(`/w/${slug}/messages/${channels[0].id}`)
    }
  }, [channels, conversationId, router, slug])

  useEffect(() => {
    if (!conversationId) {
      return
    }
    realtime.joinConversation(conversationId)
    realtime.markRead(conversationId)
    void api.messaging.markRead(conversationId).then((summary) => {
      queryClient.setQueryData(
        conversationKeys.list(workspaceId),
        (current: Conversation[] | undefined) =>
          current?.map((row) => (row.id === summary.id ? summary : row))
      )
    })
    return () => {
      realtime.leaveConversation(conversationId)
    }
    // join/leave when the thread changes; realtime identity is stable enough per workspace
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, workspaceId])

  const startDm = async (userId: string) => {
    const conversation = await api.messaging.openDm(workspaceId, userId)
    queryClient.setQueryData<Conversation[]>(
      conversationKeys.list(workspaceId),
      (current) => {
        if (!current) {
          return [conversation]
        }
        if (!current.some((row) => row.id === conversation.id)) {
          return [conversation, ...current]
        }
        return current.map((row) =>
          row.id === conversation.id ? conversation : row
        )
      }
    )
    await queryClient.invalidateQueries({
      queryKey: conversationKeys.list(workspaceId)
    })
    router.push(`/w/${slug}/messages/${conversation.id}`)
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <aside
        className={cn(
          'w-full shrink-0 border-r border-border md:w-72 md:min-h-0',
          conversationId ? 'hidden md:flex md:flex-col' : 'flex min-h-0 flex-col'
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Messages</p>
            <p className="text-xs text-muted-foreground">
              {realtime.connected ? 'Live' : 'Reconnecting…'}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-muted"
              title="Create a channel"
              aria-label="Create a channel"
              onClick={() => setCreating(true)}
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>
        <label className="relative mx-3 mt-3 block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search messages, channels, people"
            className="h-9 w-full rounded-full border border-border bg-muted/50 pl-9 pr-3 text-sm"
          />
        </label>
        {creating && canManage ? (
          <div className="border-b border-border p-3">
            <CreateChannelForm
              workspaceId={workspaceId}
              slug={slug}
              onCreated={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {debouncedQuery.length > 1 ? (
            <div className="px-1">
              {search.isFetching ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Searching…
                </p>
              ) : search.isError ? (
                <p className="px-2 py-6 text-center text-sm text-red-600">
                  Search failed
                </p>
              ) : (search.data ?? []).length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No messages match that search.
                </p>
              ) : (
                <SearchResults
                  hits={search.data ?? []}
                  onSelect={(hit) => router.push(hit.href)}
                />
              )}
            </div>
          ) : (
            <>
              <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Channels
              </p>
              {channelPreview.visible.map((conversation) => (
                <ConversationLink
                  key={conversation.id}
                  conversation={conversation}
                  slug={slug}
                  active={conversation.id === conversationId}
                />
              ))}
              {channelPreview.hiddenCount > 0 ? (
                <button
                  type="button"
                  className="mt-0.5 w-full rounded-xl px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setChannelsExpanded((open) => !open)}
                >
                  {channelsExpanded
                    ? 'Show less'
                    : `Show ${channelPreview.hiddenCount} more`}
                </button>
              ) : null}
              <p className="mt-3 px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Direct messages
              </p>
              {dms.map((conversation) => (
                <ConversationLink
                  key={conversation.id}
                  conversation={conversation}
                  slug={slug}
                  active={conversation.id === conversationId}
                  online={Boolean(
                    conversation.peer &&
                      realtime.onlineIds.includes(conversation.peer.id)
                  )}
                />
              ))}
              <PeoplePreview
                members={(members.data ?? []).filter(
                  (member) =>
                    member.userId !== me.data?.id &&
                    !dms.some(
                      (conversation) => conversation.peer?.id === member.userId
                    )
                )}
                onlineIds={realtime.onlineIds}
                membersHref={`/w/${slug}/members`}
                onStart={(userId) => void startDm(userId)}
              />
            </>
          )}
        </div>
      </aside>

      <section
        className={cn(
          'min-h-0 min-w-0 flex-1 flex-col',
          conversationId ? 'flex' : 'hidden md:flex'
        )}
      >
        {active && me.data ? (
          <Thread
            conversation={active}
            slug={slug}
            meId={me.data.id}
            connected={realtime.connected}
            typingIds={realtime.typingByConversation[active.id] ?? []}
            canModerate={canManage}
            onSend={(content, clientId, attachmentIds) =>
              realtime.sendMessage({
                conversationId: active.id,
                content,
                clientId,
                attachmentIds
              })
            }
            workspaceId={workspaceId}
            allowVideo
            onTyping={() => realtime.emitTyping(active.id)}
            onEdit={(messageId, content) =>
              void realtime.editMessage(messageId, content)
            }
            onDelete={(messageId) => void realtime.deleteMessage(messageId)}
            onlineIds={realtime.onlineIds}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Select a channel or start a direct message.
          </div>
        )}
      </section>
    </div>
  )
}

function ConversationLink({
  conversation,
  slug,
  active,
  online
}: {
  conversation: Conversation
  slug: string
  active: boolean
  online?: boolean
}) {
  const label =
    conversation.type === 'channel'
      ? `# ${conversation.name}`
      : conversation.peer?.displayName ?? 'Direct message'
  return (
    <Link
      href={`/w/${slug}/messages/${conversation.id}`}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2 py-2 text-sm',
        active ? 'bg-accent/70 font-medium' : 'hover:bg-muted'
      )}
    >
      {conversation.type === 'channel' ? (
        <Hash className="size-4 text-muted-foreground" />
      ) : (
        <span className="relative">
          <MessageCircle className="size-4 text-muted-foreground" />
          {online ? (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-500" />
          ) : null}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {conversation.unreadCount > 0 ? (
        <span className="rounded-full bg-accent px-1.5 text-xs font-semibold">
          {conversation.unreadCount}
        </span>
      ) : null}
    </Link>
  )
}

function PeoplePreview({
  members,
  onlineIds,
  membersHref,
  onStart
}: {
  members: WorkspaceMember[]
  onlineIds: string[]
  membersHref: string
  onStart: (userId: string) => void
}) {
  const preview = members.slice(0, MEMBER_PREVIEW_COUNT)
  const hidden = members.length - preview.length
  if (preview.length === 0) {
    return null
  }
  return (
    <div className="mt-2 space-y-1">
      {preview.map((member) => (
        <button
          key={member.userId}
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-muted"
          onClick={() => onStart(member.userId)}
        >
          <span className="relative">
            <Avatar name={member.displayName} src={member.avatarUrl} size={28} />
            {onlineIds.includes(member.userId) ? (
              <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500" />
            ) : null}
          </span>
          <span className="min-w-0 flex-1 truncate">{member.displayName}</span>
        </button>
      ))}
      {hidden > 0 ? (
        <Link
          href={membersHref}
          className="block rounded-xl px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          +{hidden} more members
        </Link>
      ) : null}
    </div>
  )
}

function Thread({
  conversation,
  slug,
  meId,
  connected,
  typingIds,
  canModerate,
  onSend,
  onTyping,
  onEdit,
  onDelete,
  onlineIds,
  workspaceId,
  allowVideo
}: {
  conversation: Conversation
  slug: string
  meId: string
  connected: boolean
  typingIds: string[]
  canModerate: boolean
  onSend: (
    content: string,
    clientId: string,
    attachmentIds: string[]
  ) => Promise<void>
  onTyping: () => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onlineIds: string[]
  workspaceId: string
  allowVideo: boolean
}) {
  const queryClient = useQueryClient()
  const title =
    conversation.type === 'channel'
      ? `#${conversation.name}`
      : conversation.peer?.displayName ?? 'Direct message'
  const thread = useInfiniteQuery(messageQueries.infinite(conversation.id))
  const messages = useMemo(
    () => flattenMessagePages(thread.data?.pages ?? []),
    [thread.data?.pages]
  )
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 12
  })
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(
    null
  )

  useEffect(() => {
    const element = parentRef.current
    if (!element) {
      return
    }
    element.scrollTop = element.scrollHeight
  }, [messages.length, conversation.id])

  const commitSend = (content: string, attached: FileAttachment[]) => {
    if (!content && attached.length === 0) {
      return
    }
    const clientId = crypto.randomUUID()
    const optimistic: ChatMessage = {
      id: clientId,
      conversationId: conversation.id,
      authorId: meId,
      content,
      clientId,
      editedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
      attachments: attached,
      author: {
        id: meId,
        displayName: 'You',
        jobTitle: '',
        avatarUrl: null
      }
    }
    queryClient.setQueryData(conversationKeys.messages(conversation.id), (current) => {
      if (!current || typeof current !== 'object' || !('pages' in current)) {
        return {
          pageParams: [undefined],
          pages: [{ data: [optimistic], nextCursor: null }]
        }
      }
      const pages = current.pages as { data: ChatMessage[]; nextCursor: string | null }[]
      const nextPages = pages.map((page, index) =>
        index === 0 ? { ...page, data: upsertMessage(page.data, optimistic) } : page
      )
      return { ...current, pages: nextPages }
    })
    void onSend(
      content,
      clientId,
      attached.map((file) => file.id)
    )
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: fileKeys.all })
      })
      .catch(() => {
      queryClient.setQueryData(conversationKeys.messages(conversation.id), (current) => {
        if (!current || typeof current !== 'object' || !('pages' in current)) {
          return current
        }
        const pages = (
          current.pages as { data: ChatMessage[]; nextCursor: string | null }[]
        ).map((page, index) =>
          index === 0
            ? { ...page, data: markFailed(page.data, clientId) }
            : page
        )
        return { ...current, pages }
      })
    })
  }

  const send = () => {
    const attached = attachments
    commitSend(draft.trim(), attached)
    setDraft('')
    setAttachments([])
  }

  const sendRecording = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await uploadWorkspaceFile(workspaceId, file)
      commitSend('', [uploaded])
    } finally {
      setUploading(false)
    }
  }

  const retry = useMutation({
    mutationFn: (message: ChatMessage) =>
      api.messaging.send(conversation.id, {
        content: message.content,
        clientId: message.clientId,
        attachmentIds: message.attachments?.map((file) => file.id)
      }),
    onError: (_error, message) => {
      queryClient.setQueryData(conversationKeys.messages(conversation.id), (current) => {
        if (!current || typeof current !== 'object' || !('pages' in current)) {
          return current
        }
        const pages = (current.pages as { data: ChatMessage[]; nextCursor: string | null }[]).map(
          (page, index) =>
            index === 0
              ? { ...page, data: markFailed(page.data, message.clientId) }
              : page
        )
        return { ...current, pages }
      })
    }
  })

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          href={`/w/${slug}/messages`}
          className="text-sm text-muted-foreground md:hidden"
        >
          Back
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.topic ||
              (conversation.peer
                ? conversation.peer.jobTitle
                : 'Public workspace channel')}
            {conversation.peer && onlineIds.includes(conversation.peer.id)
              ? ' · online'
              : ''}
          </p>
        </div>
        {!connected ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <WifiOff className="size-3.5" /> Offline
          </span>
        ) : null}
      </header>
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {thread.hasNextPage ? (
          <button
            type="button"
            className="mb-3 text-xs text-muted-foreground"
            onClick={() => void thread.fetchNextPage()}
          >
            Load earlier messages
          </button>
        ) : null}
        {thread.isPending ? (
          <p className="text-sm text-muted-foreground">Loading conversation…</p>
        ) : null}
        {thread.isError ? (
          <p className="text-sm text-red-600">Could not load messages.</p>
        ) : null}
        {!thread.isPending && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Say hello.
          </p>
        ) : null}
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const message = messages[item.index]
            if (!message) {
              return null
            }
            const mine = message.authorId === meId
            return (
              <div
                key={message.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full pb-3"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <article className="flex gap-3">
                  <Avatar
                    name={message.author.displayName}
                    src={message.author.avatarUrl}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold">
                        {message.author.displayName}
                      </span>
                      <time className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                      {message.pending ? (
                        <span className="text-xs text-muted-foreground">Sending…</span>
                      ) : null}
                      {message.failed ? (
                        <button
                          type="button"
                          className="text-xs text-red-600"
                          onClick={() => retry.mutate(message)}
                        >
                          Failed · Retry
                        </button>
                      ) : null}
                    </div>
                    {message.deletedAt ? (
                      <p className="italic text-muted-foreground">
                        This message was deleted
                      </p>
                    ) : editing?.id === message.id ? (
                      <form
                        className="mt-1 space-y-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const next = editing.content.trim()
                          if (!next) {
                            return
                          }
                          if (next !== message.content) {
                            onEdit(message.id, next)
                          }
                          setEditing(null)
                        }}
                      >
                        <AttachmentGrid files={message.attachments ?? []} />
                        <div className="flex flex-wrap gap-2">
                          <input
                            className="h-9 min-w-0 flex-1 rounded-lg border border-border px-2 text-sm"
                            value={editing.content}
                            autoFocus
                            aria-label="Edit message text"
                            onChange={(event) =>
                              setEditing({
                                id: message.id,
                                content: event.target.value
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                setEditing(null)
                              }
                            }}
                          />
                          <Button type="submit" className="h-9">
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {message.content ? (
                          <p className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </p>
                        ) : null}
                        <AttachmentGrid files={message.attachments ?? []} />
                      </>
                    )}
                    {message.editedAt && !message.deletedAt ? (
                      <p className="text-xs text-muted-foreground">(edited)</p>
                    ) : null}
                    {(mine || canModerate) &&
                    !message.deletedAt &&
                    !message.pending &&
                    editing?.id !== message.id ? (
                      <div className="mt-1 flex gap-2 text-xs">
                        {mine && canEditMessageText(message) ? (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setEditing({ id: message.id, content: message.content })
                            }
                          >
                            Edit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() => onDelete(message.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      </div>
      <footer className="shrink-0 border-t border-border p-3">
        {typingIds.filter((id) => id !== meId).length > 0 ? (
          <p className="mb-2 text-xs text-muted-foreground">Someone is typing…</p>
        ) : null}
        <div className="mb-2 space-y-2">
          <MediaComposer
            remaining={MAX_ATTACHMENTS - attachments.length}
            disabled={uploading}
            sending={uploading}
            allowVideo={allowVideo}
            onSend={sendRecording}
          />
          <FileDropzone
            remaining={MAX_ATTACHMENTS - attachments.length}
            disabled={uploading}
            onFiles={(files) => {
              setUploading(true)
              void Promise.all(
                files.map((file) => uploadWorkspaceFile(workspaceId, file))
              )
                .then((uploaded) => {
                  setAttachments((current) =>
                    [...current, ...uploaded].slice(0, MAX_ATTACHMENTS)
                  )
                })
                .finally(() => setUploading(false))
            }}
          />
          <AttachmentGrid
            files={attachments}
            canRemove
            onRemove={(id) =>
              setAttachments((current) => current.filter((file) => file.id !== id))
            }
          />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <textarea
            value={draft}
            rows={1}
            placeholder={`Message ${title}`}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm"
            onChange={(event) => {
              setDraft(event.target.value)
              onTyping()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
          />
          <Button
            type="submit"
            className="h-11 w-11 p-0"
            aria-label="Send"
            disabled={uploading}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </footer>
    </>
  )
}
