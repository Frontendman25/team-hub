import { describe, expect, it, vi } from 'vitest'
import { CreateNotificationUseCase } from '../../src/modules/notifications/application/create-notification.use-case'
import type { NotificationsRepository } from '../../src/modules/notifications/domain/notifications.repository'
import type { UnreadCountCache } from '../../src/modules/notifications/infrastructure/unread-count.cache'

const sarah = '11111111-1111-4111-8111-111111111111'
const daniel = '44444444-4444-4444-8444-444444444444'
const postId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function cache(): UnreadCountCache {
  return {
    invalidate: vi.fn().mockResolvedValue(undefined)
  } as unknown as UnreadCountCache
}

describe('CreateNotificationUseCase', () => {
  it('does not persist a notification for a user acting on their own post', async () => {
    const notifications: NotificationsRepository = {
      create: vi.fn(),
      listByRecipient: vi.fn(),
      countUnread: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn()
    }

    const useCase = new CreateNotificationUseCase(notifications, cache())
    await useCase.execute({
      recipientId: sarah,
      actorId: sarah,
      type: 'comment',
      postId,
      commentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    })

    expect(notifications.create).not.toHaveBeenCalled()
  })

  it('persists a notification when the actor is not the recipient', async () => {
    const notifications: NotificationsRepository = {
      create: vi.fn().mockResolvedValue(undefined),
      listByRecipient: vi.fn(),
      countUnread: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn()
    }
    const unread = cache()

    const useCase = new CreateNotificationUseCase(notifications, unread)
    await useCase.execute({
      recipientId: daniel,
      actorId: sarah,
      type: 'reaction',
      postId
    })

    expect(notifications.create).toHaveBeenCalledWith({
      recipientId: daniel,
      actorId: sarah,
      type: 'reaction',
      postId
    })
    expect(unread.invalidate).toHaveBeenCalledWith(daniel)
  })
})
