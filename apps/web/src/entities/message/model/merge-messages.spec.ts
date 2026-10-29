import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@/shared/types/api'
import {
  flattenMessagePages,
  markFailed,
  upsertMessage
} from './merge-messages'

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    conversationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    authorId: '11111111-1111-4111-8111-111111111111',
    content: 'Hello',
    clientId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    editedAt: null,
    deletedAt: null,
    createdAt: '2026-10-26T10:00:00.000Z',
    author: {
      id: '11111111-1111-4111-8111-111111111111',
      displayName: 'Sarah Chen',
      jobTitle: 'Product',
      avatarUrl: null
    },
    ...overrides
  }
}

describe('upsertMessage', () => {
  it('replaces an optimistic row using clientId', () => {
    const pending = message({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      pending: true
    })
    const confirmed = message({ pending: false })
    const result = upsertMessage([pending], confirmed)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(confirmed.id)
    expect(result[0]?.pending).toBe(false)
  })

  it('ignores a duplicate socket event', () => {
    const existing = message()
    const result = upsertMessage([existing], message())
    expect(result).toHaveLength(1)
  })
})

describe('flattenMessagePages', () => {
  it('deduplicates overlapping pages after reconnect', () => {
    const older = message({
      id: '11111111-1111-4111-8111-111111111111',
      clientId: '11111111-1111-4111-8111-111111111111',
      content: 'older'
    })
    const newer = message({ content: 'newer' })
    const result = flattenMessagePages([
      { data: [older, newer] },
      { data: [older] }
    ])
    expect(result.map((row) => row.content)).toEqual(['older', 'newer'])
  })
})

describe('markFailed', () => {
  it('flags the optimistic client row', () => {
    const pending = message({ pending: true })
    const result = markFailed([pending], pending.clientId)
    expect(result[0]?.failed).toBe(true)
    expect(result[0]?.pending).toBe(false)
  })
})
