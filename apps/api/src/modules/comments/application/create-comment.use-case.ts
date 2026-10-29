import { Inject, Injectable } from '@nestjs/common'
import { GuestWriteLimiter } from '../../auth/infrastructure/guest-write-limiter'
import { CreateNotificationUseCase } from '../../notifications/application/create-notification.use-case'
import { GetPostUseCase } from '../../posts/application/get-post.use-case'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import type { CommentsRepository } from '../domain/comments.repository'
import { COMMENTS_REPOSITORY } from '../comments.tokens'

@Injectable()
export class CreateCommentUseCase {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository,
    private readonly getPost: GetPostUseCase,
    private readonly notify: CreateNotificationUseCase,
    private readonly demo: DemoPolicy,
    private readonly guestWrites: GuestWriteLimiter
  ) {}

  async execute(input: { postId: string; actorId: string; content: string }) {
    await this.guestWrites.assertFor(this.demo, input.actorId)
    const post = await this.getPost.execute(input.postId, input.actorId)
    const comment = await this.comments.create({
      postId: input.postId,
      authorId: input.actorId,
      content: input.content
    })

    await this.notify.execute({
      recipientId: post.authorId,
      actorId: input.actorId,
      type: 'comment',
      postId: post.id,
      commentId: comment.id,
      workspaceId: post.workspaceId
    })

    return comment
  }
}
