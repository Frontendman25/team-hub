import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import type { CommentsRepository } from '../domain/comments.repository'
import { COMMENTS_REPOSITORY } from '../comments.tokens'

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository
  ) {}

  async execute(commentId: string, actorId: string): Promise<void> {
    const comment = await this.comments.findById(commentId)
    if (!comment) {
      throw new NotFoundError('Comment not found')
    }
    if (comment.authorId !== actorId) {
      throw new ForbiddenError('You can only delete your own comments')
    }
    await this.comments.delete(commentId)
  }
}
