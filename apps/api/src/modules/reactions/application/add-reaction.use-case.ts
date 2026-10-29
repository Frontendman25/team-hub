import { Inject, Injectable } from '@nestjs/common'
import { CreateNotificationUseCase } from '../../notifications/application/create-notification.use-case'
import { GetPostUseCase } from '../../posts/application/get-post.use-case'
import type { PostRecord } from '../../posts/domain/post.repository'
import type { ReactionsRepository } from '../domain/reactions.repository'
import { REACTIONS_REPOSITORY } from '../reactions.tokens'

@Injectable()
export class AddReactionUseCase {
  constructor(
    @Inject(REACTIONS_REPOSITORY)
    private readonly reactions: ReactionsRepository,
    private readonly getPost: GetPostUseCase,
    private readonly notify: CreateNotificationUseCase
  ) {}

  async execute(postId: string, actorId: string): Promise<PostRecord> {
    const post = await this.getPost.execute(postId, actorId)
    const added = await this.reactions.add(postId, actorId, 'like')
    if (added) {
      await this.notify.execute({
        recipientId: post.authorId,
        actorId,
        type: 'reaction',
        postId,
        workspaceId: post.workspaceId
      })
    }
    return this.getPost.execute(postId, actorId)
  }
}
