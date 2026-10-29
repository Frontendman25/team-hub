import { Inject, Injectable } from '@nestjs/common'
import { UnauthorizedError } from '../../../shared/domain/errors'
import { HydrateAttachments } from '../../files/application/hydrate-attachments'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type {
  ListPostsQuery,
  ListPostsResult,
  PostRepository
} from '../domain/post.repository'
import { POSTS_REPOSITORY } from '../posts.tokens'

@Injectable()
export class ListPostsUseCase {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly posts: PostRepository,
    private readonly access: WorkspaceAccess,
    private readonly attachments: HydrateAttachments
  ) {}

  async execute(
    query: ListPostsQuery & { actorId?: string }
  ): Promise<ListPostsResult> {
    if (!query.actorId) {
      throw new UnauthorizedError('Authentication required')
    }
    await this.access.requireMember(query.workspaceId, query.actorId)
    const result = await this.posts.list({
      ...query,
      viewerId: query.actorId
    })
    return {
      ...result,
      items: await this.attachments.posts(result.items)
    }
  }
}
