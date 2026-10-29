import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import { HydrateAttachments } from '../../files/application/hydrate-attachments'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { PostRecord, PostRepository } from '../domain/post.repository'
import { POSTS_REPOSITORY } from '../posts.tokens'

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly posts: PostRepository,
    private readonly access: WorkspaceAccess,
    private readonly attachments: HydrateAttachments
  ) {}

  async execute(id: string, actorId: string): Promise<PostRecord> {
    const post = await this.posts.findById(id, actorId)
    if (!post) {
      throw new NotFoundError('Post not found')
    }
    try {
      await this.access.requireMember(post.workspaceId, actorId)
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new NotFoundError('Post not found')
      }
      throw error
    }
    return this.attachments.post(post)
  }
}
