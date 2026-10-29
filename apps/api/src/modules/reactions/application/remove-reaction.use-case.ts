import { Inject, Injectable } from '@nestjs/common'
import { GetPostUseCase } from '../../posts/application/get-post.use-case'
import type { PostRecord } from '../../posts/domain/post.repository'
import type { ReactionsRepository } from '../domain/reactions.repository'
import { REACTIONS_REPOSITORY } from '../reactions.tokens'

@Injectable()
export class RemoveReactionUseCase {
  constructor(
    @Inject(REACTIONS_REPOSITORY)
    private readonly reactions: ReactionsRepository,
    private readonly getPost: GetPostUseCase
  ) {}

  async execute(postId: string, actorId: string): Promise<PostRecord> {
    await this.getPost.execute(postId, actorId)
    await this.reactions.remove(postId, actorId)
    return this.getPost.execute(postId, actorId)
  }
}
