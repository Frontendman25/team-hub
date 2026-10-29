import { describe, expect, it, vi } from 'vitest'
import {
  UNREAD_COUNT_TTL_SECONDS,
  UnreadCountCache
} from '../../src/modules/notifications/infrastructure/unread-count.cache'
import type { RedisService } from '../../src/infrastructure/redis/redis.service'

const userId = '11111111-1111-4111-8111-111111111111'

describe('UnreadCountCache', () => {
  it('uses a per-user key and a 60s TTL', async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined)
    } as unknown as RedisService
    const cache = new UnreadCountCache(redis)

    expect(cache.key(userId)).toBe(`th:unread:${userId}`)
    await cache.write(userId, 7)
    expect(redis.set).toHaveBeenCalledWith(
      `th:unread:${userId}`,
      '7',
      UNREAD_COUNT_TTL_SECONDS
    )
  })

  it('returns null when redis is unavailable', async () => {
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      set: vi.fn(),
      del: vi.fn()
    } as unknown as RedisService
    const cache = new UnreadCountCache(redis)

    await expect(cache.read(userId)).resolves.toBeNull()
  })

  it('swallows delete failures so mark-read still succeeds', async () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn().mockRejectedValue(new Error('redis down'))
    } as unknown as RedisService
    const cache = new UnreadCountCache(redis)

    await expect(cache.invalidate(userId)).resolves.toBeUndefined()
  })
})
