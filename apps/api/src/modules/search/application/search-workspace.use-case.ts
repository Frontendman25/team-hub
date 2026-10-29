import { Inject, Injectable } from '@nestjs/common'
import { toPrefixTsQuery } from '../../../infrastructure/search/prefix-tsquery'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type {
  SearchHitRecord,
  SearchKind,
  SearchRepository
} from '../domain/search.repository'
import { SEARCH_REPOSITORY } from '../search.tokens'

export type SearchHit = SearchHitRecord & {
  href: string
}

@Injectable()
export class SearchWorkspaceUseCase {
  constructor(
    @Inject(SEARCH_REPOSITORY)
    private readonly search: SearchRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    query: string
    limit: number
    kinds: SearchKind[]
  }): Promise<{ data: SearchHit[] }> {
    const { workspace } = await this.access.requireMember(
      input.workspaceId,
      input.actorId
    )
    const tsQuery = toPrefixTsQuery(input.query)
    if (!tsQuery) {
      return { data: [] }
    }

    const kinds = input.kinds.length > 0 ? input.kinds : undefined
    const selected =
      kinds ?? (['person', 'channel', 'post', 'message'] as SearchKind[])
    const perKind = Math.max(1, Math.ceil(input.limit / selected.length))
    const hits = await this.search.search({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      tsQuery,
      perKind,
      kinds: selected
    })

    return {
      data: hits.slice(0, input.limit).map((hit) => ({
        ...hit,
        href: hrefFor(hit, workspace.slug)
      }))
    }
  }
}

function hrefFor(hit: SearchHitRecord, workspaceSlug: string): string {
  switch (hit.kind) {
    case 'person':
      return `/users/${hit.id}`
    case 'channel':
    case 'message':
      return `/w/${workspaceSlug}/messages/${hit.conversationId ?? hit.id}`
    case 'post':
      return `/posts/${hit.id}`
  }
}
