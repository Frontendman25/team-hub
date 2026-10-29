import { describe, expect, it, vi } from 'vitest'
import type { HydrateAttachments } from '../../src/modules/files/application/hydrate-attachments'
import { CreatePostUseCase } from '../../src/modules/posts/application/create-post.use-case'
import type {
  PostRecord,
  PostRepository
} from '../../src/modules/posts/domain/post.repository'
import type { WorkspaceAccess } from '../../src/modules/workspaces/application/workspace-access'

const actorId = '11111111-1111-4111-8111-111111111111'
const workspaceId = '88888888-8888-4888-8888-888888888888'

function makePost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    workspaceId,
    authorId: actorId,
    content: 'Hello TeamHub',
    imageUrl: null,
    imageAlt: null,
    createdAt: new Date('2026-10-05T10:00:00.000Z'),
    updatedAt: new Date('2026-10-05T10:00:00.000Z'),
    commentsCount: 0,
    reactionsCount: 0,
    viewerHasReacted: false,
    author: {
      id: actorId,
      displayName: 'Sarah Chen',
      jobTitle: 'Product Team',
      avatarUrl: null
    },
    ...overrides
  }
}

describe('CreatePostUseCase', () => {
  it('creates a post in a workspace the actor belongs to', async () => {
    const created = makePost()
    const posts: PostRepository = {
      create: vi.fn().mockResolvedValue(created),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
    const access = {
      requireMember: vi.fn().mockResolvedValue({ role: 'member' })
    } as unknown as WorkspaceAccess

    const attachments = {
      post: vi.fn(async (post: unknown) => post)
    } as unknown as HydrateAttachments
    const demo = {
      actor: vi.fn()
    }
    const guestWrites = {
      assertFor: vi.fn().mockResolvedValue(undefined)
    }
    const useCase = new CreatePostUseCase(
      posts,
      access,
      attachments,
      demo as never,
      guestWrites as never
    )
    const result = await useCase.execute({
      actorId,
      workspaceId,
      content: 'Hello TeamHub',
      imageUrl: null,
      imageAlt: null
    })

    expect(access.requireMember).toHaveBeenCalledWith(workspaceId, actorId)
    expect(posts.create).toHaveBeenCalledWith({
      workspaceId,
      authorId: actorId,
      content: 'Hello TeamHub',
      imageUrl: null,
      imageAlt: null,
      attachmentIds: []
    })
    expect(result.id).toBe(created.id)
  })
})
