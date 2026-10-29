import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError } from '../../../shared/domain/errors'
import type { PostRepository } from '../domain/post.repository'
import { POSTS_REPOSITORY } from '../posts.tokens'
import { GetPostUseCase } from './get-post.use-case'

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly posts: PostRepository,
    private readonly getPost: GetPostUseCase
  ) {}

  async execute(postId: string, actorId: string): Promise<void> {
    const post = await this.getPost.execute(postId, actorId)

    if (post.authorId !== actorId) {
      throw new ForbiddenError('You can only delete your own posts')
    }

    await this.posts.delete(postId)
  }
}
