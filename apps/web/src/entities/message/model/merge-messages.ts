import type { ChatMessage } from '@/shared/types/api'

export function upsertMessage(
  messages: ChatMessage[],
  incoming: ChatMessage
): ChatMessage[] {
  const byClient = messages.findIndex(
    (message) =>
      message.clientId === incoming.clientId || message.id === incoming.id
  )
  if (byClient >= 0) {
    const next = [...messages]
    next[byClient] = { ...incoming, pending: false, failed: false }
    return next
  }
  return [...messages, incoming].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
      left.id.localeCompare(right.id)
  )
}

export function flattenMessagePages(
  pages: { data: ChatMessage[] }[]
): ChatMessage[] {
  const merged: ChatMessage[] = []
  const seen = new Set<string>()
  for (const page of [...pages].reverse()) {
    for (const message of page.data) {
      const key = message.id || message.clientId
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      merged.push(message)
    }
  }
  return merged
}

export function markFailed(
  messages: ChatMessage[],
  clientId: string
): ChatMessage[] {
  return messages.map((message) =>
    message.clientId === clientId
      ? { ...message, pending: false, failed: true }
      : message
  )
}
