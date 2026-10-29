import { describe, expect, it, vi } from 'vitest'
import { CreateCommentUseCase } from '../../src/modules/comments/application/create-comment.use-case'
import type {
  CommentRecord,
  CommentsRepository
} from '../../src/modules/comments/domain/comments.repository'
import { CreateNotificationUseCase } from '../../src/modules/notifications/application/create-notification.use-case'
import type { GetPostUseCase } from '../../src/modules/posts/application/get-post.use-case'
import type { PostRecord } from '../../src/modules/posts/domain/post.repository'

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
    reactionsCount: 0,
    viewerHasReacted: false,
    author: {
      id: authorId,
      displayName: 'Author',
      jobTitle: 'Engineering',
      avatarUrl: null
    }
  }
}

function makeComment(authorId: string): CommentRecord {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    postId,
    authorId,
    content: 'Nice work',
    createdAt: new Date('2026-10-22T11:00:00.000Z'),
    updatedAt: new Date('2026-10-22T11:00:00.000Z'),
    author: {
      id: authorId,
      displayName: 'Commenter',
      jobTitle: 'Product Team',
      avatarUrl: null
    }
  }
}

describe('CreateCommentUseCase', () => {
  it('notifies the post author after someone else comments', async () => {
    const comment = makeComment(sarah)
    const comments: CommentsRepository = {
      listByPost: vi.fn(),
      create: vi.fn().mockResolvedValue(comment),
      findById: vi.fn(),
      delete: vi.fn()
    }
    const getPost = {
      execute: vi.fn().mockResolvedValue(makePost(daniel))
    } as unknown as GetPostUseCase
    const notify = {
      execute: vi.fn().mockResolvedValue(undefined)
    } as unknown as CreateNotificationUseCase

    const demo = {}
    const guestWrites = { assertFor: vi.fn().mockResolvedValue(undefined) }
    const useCase = new CreateCommentUseCase(
      comments,
      getPost,
      notify,
      demo as never,
      guestWrites as never
    )
    await useCase.execute({
      postId,
      actorId: sarah,
      content: 'Nice work'
    })

    expect(notify.execute).toHaveBeenCalledWith({
      recipientId: daniel,
      actorId: sarah,
      type: 'comment',
      postId,
      commentId: comment.id,
      workspaceId
    })
  })
})
