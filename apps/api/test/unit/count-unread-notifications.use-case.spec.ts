import { describe, expect, it, vi } from 'vitest'
import { CountUnreadNotificationsUseCase } from '../../src/modules/notifications/application/count-unread-notifications.use-case'
import type { NotificationsRepository } from '../../src/modules/notifications/domain/notifications.repository'
import type { UnreadCountCache } from '../../src/modules/notifications/infrastructure/unread-count.cache'

const userId = '11111111-1111-4111-8111-111111111111'

function repo(count = 3): NotificationsRepository {
  return {
    create: vi.fn(),
    listByRecipient: vi.fn(),
    countUnread: vi.fn().mockResolvedValue(count),
    markRead: vi.fn(),
    markAllRead: vi.fn()
  }
}

describe('CountUnreadNotificationsUseCase', () => {
  it('returns a cache hit without querying postgres', async () => {
    const notifications = repo()
    const cache = {
      read: vi.fn().mockResolvedValue(4),
      write: vi.fn(),
      invalidate: vi.fn()
    } as unknown as UnreadCountCache

    const result = await new CountUnreadNotificationsUseCase(
      notifications,
      cache
    ).execute(userId)

    expect(result).toEqual({ count: 4, cache: 'hit' })
    expect(notifications.countUnread).not.toHaveBeenCalled()
    expect(cache.write).not.toHaveBeenCalled()
  })

  it('loads postgres on a miss and writes the cache', async () => {
    const notifications = repo(2)
    const cache = {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn()
    } as unknown as UnreadCountCache

    const result = await new CountUnreadNotificationsUseCase(
      notifications,
      cache
    ).execute(userId)

    expect(result).toEqual({ count: 2, cache: 'miss' })
    expect(cache.write).toHaveBeenCalledWith(userId, 2)
  })

  it('still returns the postgres count when cache write is a no-op', async () => {
    const notifications = repo(1)
    const cache = {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn()
    } as unknown as UnreadCountCache

    const result = await new CountUnreadNotificationsUseCase(
      notifications,
      cache
    ).execute(userId)

    expect(result).toEqual({ count: 1, cache: 'miss' })
  })
})
