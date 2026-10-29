import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../src/shared/domain/errors'
import { DeletePostUseCase } from '../../src/modules/posts/application/delete-post.use-case'
import type { GetPostUseCase } from '../../src/modules/posts/application/get-post.use-case'
import type { PostRepository } from '../../src/modules/posts/domain/post.repository'

describe('DeletePostUseCase', () => {
  it('forbids deleting another user post', async () => {
    const posts: PostRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
    const getPost = {
      execute: vi.fn().mockResolvedValue({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        authorId: '11111111-1111-4111-8111-111111111111'
      })
    } as unknown as GetPostUseCase

    await expect(
      new DeletePostUseCase(posts, getPost).execute(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '22222222-2222-4222-8222-222222222222'
      )
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(posts.delete).not.toHaveBeenCalled()
  })
})
