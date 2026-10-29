import { Inject, Injectable } from '@nestjs/common'
import { GetPostUseCase } from '../../posts/application/get-post.use-case'
import type { CommentsRepository } from '../domain/comments.repository'
import { COMMENTS_REPOSITORY } from '../comments.tokens'

@Injectable()
export class ListCommentsUseCase {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository,
    private readonly getPost: GetPostUseCase
  ) {}

  async execute(postId: string, actorId: string) {
    await this.getPost.execute(postId, actorId)
    return this.comments.listByPost(postId)
  }
}
