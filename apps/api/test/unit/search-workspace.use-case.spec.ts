import { describe, expect, it, vi } from 'vitest'
import { SearchWorkspaceUseCase } from '../../src/modules/search/application/search-workspace.use-case'
import type { WorkspaceAccess } from '../../src/modules/workspaces/application/workspace-access'
import type { SearchRepository } from '../../src/modules/search/domain/search.repository'
import { ForbiddenError } from '../../src/shared/domain/errors'

describe('SearchWorkspaceUseCase', () => {
  it('requires membership then ranks hits with workspace hrefs', async () => {
    const access = {
      requireMember: vi.fn().mockResolvedValue({
        workspace: { id: 'ws', slug: 'teamhub' }
      })
    } as unknown as WorkspaceAccess
    const search = {
      search: vi.fn().mockResolvedValue([
        {
          kind: 'person',
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Sarah Chen',
          snippet: 'Product',
          rank: 0.2,
          conversationId: null,
          authorName: null
        }
      ])
    } as unknown as SearchRepository

    const result = await new SearchWorkspaceUseCase(search, access).execute({
      workspaceId: '88888888-8888-4888-8888-888888888888',
      actorId: '11111111-1111-4111-8111-111111111111',
      query: 'Sarah',
      limit: 24,
      kinds: ['person']
    })

    expect(result.data[0]?.href).toBe(
      '/users/11111111-1111-4111-8111-111111111111'
    )
  })

  it('does not query when the actor is not a member', async () => {
    const search = { search: vi.fn() } as unknown as SearchRepository
    const access = {
      requireMember: vi.fn().mockRejectedValue(new ForbiddenError())
    } as unknown as WorkspaceAccess

    await expect(
      new SearchWorkspaceUseCase(search, access).execute({
        workspaceId: '88888888-8888-4888-8888-888888888888',
        actorId: '11111111-1111-4111-8111-111111111111',
        query: 'secret',
        limit: 24,
        kinds: ['message']
      })
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(search.search).not.toHaveBeenCalled()
  })
})
