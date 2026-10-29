import { describe, expect, it, vi } from 'vitest'
import { CreateNotificationUseCase } from '../../src/modules/notifications/application/create-notification.use-case'
import type { GetPostUseCase } from '../../src/modules/posts/application/get-post.use-case'
import type { PostRecord } from '../../src/modules/posts/domain/post.repository'
import { AddReactionUseCase } from '../../src/modules/reactions/application/add-reaction.use-case'
import type { ReactionsRepository } from '../../src/modules/reactions/domain/reactions.repository'

const sarah = '11111111-1111-4111-8111-111111111111'
const daniel = '44444444-4444-4444-8444-444444444444'
const postId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const workspaceId = '88888888-8888-4888-8888-888888888888'

function makePost(authorId: string): PostRecord {
  return {
    id: postId,
    workspaceId,
    authorId,
    content: 'Ship notes',
    imageUrl: null,
    imageAlt: null,
    createdAt: new Date('2026-10-22T10:00:00.000Z'),
    updatedAt: new Date('2026-10-22T10:00:00.000Z'),
    commentsCount: 0,
    reactionsCount: 1,
    viewerHasReacted: true,
    author: {
      id: authorId,
      displayName: 'Author',
      jobTitle: 'Engineering',
      avatarUrl: null
    }
  }
}

describe('AddReactionUseCase', () => {
  it('notifies the post author only when a new reaction is inserted', async () => {
    const post = makePost(daniel)
    const reactions: ReactionsRepository = {
      add: vi.fn().mockResolvedValue(true),
      remove: vi.fn()
    }
    const getPost = {
      execute: vi.fn().mockResolvedValue(post)
    } as unknown as GetPostUseCase
    const notify = {
      execute: vi.fn().mockResolvedValue(undefined)
    } as unknown as CreateNotificationUseCase

    const useCase = new AddReactionUseCase(reactions, getPost, notify)
    await useCase.execute(postId, sarah)

    expect(notify.execute).toHaveBeenCalledWith({
      recipientId: daniel,
      actorId: sarah,
      type: 'reaction',
      postId,
      workspaceId
    })
  })

  it('does not notify when the reaction already existed', async () => {
    const post = makePost(daniel)
    const reactions: ReactionsRepository = {
      add: vi.fn().mockResolvedValue(false),
      remove: vi.fn()
    }
    const getPost = {
      execute: vi.fn().mockResolvedValue(post)
    } as unknown as GetPostUseCase
    const notify = {
      execute: vi.fn()
    } as unknown as CreateNotificationUseCase

    const useCase = new AddReactionUseCase(reactions, getPost, notify)
    await useCase.execute(postId, sarah)

    expect(notify.execute).not.toHaveBeenCalled()
  })
})
