'use client'

import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { conversationKeys } from '@/entities/conversation/api/queries'
import { taskKeys } from '@/entities/task/api/queries'
import { markFailed, upsertMessage } from '@/entities/message/model/merge-messages'
import { api } from '@/shared/api/client'
import { emitWithAck, isRealtimeError } from '@/shared/lib/realtime-ack'
import { getSocketUrl } from '@/shared/lib/env'
import type { ChatMessage, MessagePage } from '@/shared/types/api'

type TypingState = { userId: string; at: number }

export function useRealtime(workspaceId: string | undefined): {
  connected: boolean
  onlineIds: string[]
  typingByConversation: Record<string, string[]>
  joinConversation: (conversationId: string) => void
  leaveConversation: (conversationId: string) => void
  sendMessage: (input: {
    conversationId: string
    content: string
    clientId: string
    attachmentIds?: string[]
  }) => Promise<void>
  emitTyping: (conversationId: string) => void
  markRead: (conversationId: string) => void
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
}

export function useRealtime(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const joinedConversationRef = useRef<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [onlineIds, setOnlineIds] = useState<string[]>([])
  const [typing, setTyping] = useState<Record<string, TypingState[]>>({})

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    const socket = io(`${getSocketUrl()}/realtime`, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    const patchThread = (message: ChatMessage) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        conversationKeys.messages(message.conversationId),
        (current) => {
          if (!current) {
            return current
          }
          const pages = current.pages.map((page, index) =>
            index === 0
              ? { ...page, data: upsertMessage(page.data, message) }
              : page
          )
          return { ...current, pages }
        }
      )
    }

    const failOptimistic = (clientId?: string, conversationId?: string) => {
      if (!clientId || !conversationId) {
        return
      }
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        conversationKeys.messages(conversationId),
        (current) => {
          if (!current) {
            return current
          }
          const pages = current.pages.map((page, index) =>
            index === 0
              ? { ...page, data: markFailed(page.data, clientId) }
              : page
          )
          return { ...current, pages }
        }
      )
    }

    const recoverAfterReconnect = () => {
      socket.emit('join.workspace', { workspaceId })
      const conversationId = joinedConversationRef.current
      if (conversationId) {
        socket.emit('join.conversation', { conversationId })
      }
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.all
      })
    }

    socket.on('connect', () => {
      setConnected(true)
    })
    socket.on('session.ready', () => {
      recoverAfterReconnect()
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('presence.update', (payload: { userIds: string[] }) => {
      setOnlineIds(payload.userIds)
    })
    socket.on('message.created', (message: ChatMessage) => {
      patchThread(message)
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.list(workspaceId)
      })
    })
    socket.on('message.updated', (message: ChatMessage) => {
      patchThread(message)
    })
    socket.on('message.deleted', (message: ChatMessage) => {
      patchThread(message)
    })
    socket.on(
      'task.changed',
      (payload: { workspaceId?: string }) => {
        if (payload.workspaceId) {
          void queryClient.invalidateQueries({
            queryKey: taskKeys.list(payload.workspaceId)
          })
        }
      }
    )
    socket.on('error', (payload: unknown) => {
      if (!isRealtimeError(payload)) {
        return
      }
      failOptimistic(payload.clientId, payload.conversationId)
    })
    socket.on('typing', (payload: { conversationId: string; userId: string }) => {
      setTyping((current) => {
        const list = current[payload.conversationId] ?? []
        return {
          ...current,
          [payload.conversationId]: [
            ...list.filter((row) => row.userId !== payload.userId),
            { userId: payload.userId, at: Date.now() }
          ]
        }
      })
    })

    const ping = window.setInterval(() => {
      socket.emit('presence.ping')
    }, 20_000)
    const pruneTyping = window.setInterval(() => {
      const cutoff = Date.now() - 4000
      setTyping((current) => {
        const next: Record<string, TypingState[]> = {}
        for (const [key, rows] of Object.entries(current)) {
          const live = rows.filter((row) => row.at > cutoff)
          if (live.length > 0) {
            next[key] = live
          }
        }
        return next
      })
    }, 1000)

    return () => {
      window.clearInterval(ping)
      window.clearInterval(pruneTyping)
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [queryClient, workspaceId])

  const typingByConversation = Object.fromEntries(
    Object.entries(typing).map(([id, rows]) => [id, rows.map((row) => row.userId)])
  )

  return {
    connected,
    onlineIds,
    typingByConversation,
    joinConversation: (conversationId: string) => {
      joinedConversationRef.current = conversationId
      socketRef.current?.emit('join.conversation', { conversationId })
    },
    leaveConversation: (conversationId: string) => {
      if (joinedConversationRef.current === conversationId) {
        joinedConversationRef.current = null
      }
      socketRef.current?.emit('leave.conversation', { conversationId })
    },
    sendMessage: async (input: {
      conversationId: string
      content: string
      clientId: string
      attachmentIds?: string[]
    }) => {
      const failLocal = () => {
        queryClient.setQueryData<InfiniteData<MessagePage>>(
          conversationKeys.messages(input.conversationId),
          (current) => {
            if (!current) {
              return current
            }
            const pages = current.pages.map((page, index) =>
              index === 0
                ? { ...page, data: markFailed(page.data, input.clientId) }
                : page
            )
            return { ...current, pages }
          }
        )
      }
      const confirmLocal = (saved: ChatMessage) => {
        queryClient.setQueryData<InfiniteData<MessagePage>>(
          conversationKeys.messages(input.conversationId),
          (current) => {
            if (!current) {
              return {
                pageParams: [undefined],
                pages: [{ data: [saved], nextCursor: null }]
              }
            }
            const pages = current.pages.map((page, index) =>
              index === 0
                ? { ...page, data: upsertMessage(page.data, saved) }
                : page
            )
            return { ...current, pages }
          }
        )
      }

      const socket = socketRef.current
      if (socket?.connected) {
        try {
          const ack = await emitWithAck<unknown>(socket, 'message.send', input)
          if (isRealtimeError(ack)) {
            failLocal()
            throw new Error(ack.message)
          }
          if (
            typeof ack === 'object' &&
            ack !== null &&
            'id' in ack &&
            'clientId' in ack
          ) {
            confirmLocal(ack as ChatMessage)
          }
          return
        } catch (error) {
          const timedOut =
            error instanceof Error &&
            error.message === 'Timed out waiting for message.send'
          if (!timedOut) {
            throw error
          }
        }
      }

      try {
        const saved = await api.messaging.send(input.conversationId, {
          content: input.content,
          clientId: input.clientId,
          attachmentIds: input.attachmentIds
        })
        confirmLocal(saved)
      } catch {
        failLocal()
        throw new Error('Message failed to send')
      }
    },
    emitTyping: (conversationId: string) => {
      socketRef.current?.emit('typing.start', { conversationId })
    },
    markRead: (conversationId: string) => {
      socketRef.current?.emit('conversation.read', { conversationId })
    },
    editMessage: async (messageId: string, content: string) => {
      const socket = socketRef.current
      if (socket?.connected) {
        socket.emit('message.edit', { messageId, content })
        return
      }
      const saved = await api.messaging.edit(messageId, content)
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        conversationKeys.messages(saved.conversationId),
        (current) => {
          if (!current) {
            return current
          }
          const pages = current.pages.map((page, index) =>
            index === 0
              ? { ...page, data: upsertMessage(page.data, saved) }
              : page
          )
          return { ...current, pages }
        }
      )
    },
    deleteMessage: async (messageId: string) => {
      const socket = socketRef.current
      if (socket?.connected) {
        socket.emit('message.delete', { messageId })
        return
      }
      const saved = await api.messaging.remove(messageId)
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        conversationKeys.messages(saved.conversationId),
        (current) => {
          if (!current) {
            return current
          }
          const pages = current.pages.map((page, index) =>
            index === 0
              ? { ...page, data: upsertMessage(page.data, saved) }
              : page
          )
          return { ...current, pages }
        }
      )
    }
  }
}
