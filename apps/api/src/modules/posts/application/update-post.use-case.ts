import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import type {
  PostRecord,
  PostRepository,
  UpdatePostData
} from '../domain/post.repository'
import { POSTS_REPOSITORY } from '../posts.tokens'
import { GetPostUseCase } from './get-post.use-case'

export type UpdatePostInput = UpdatePostData & {
  postId: string
  actorId: string
}

@Injectable()
export class UpdatePostUseCase {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly posts: PostRepository,
    private readonly getPost: GetPostUseCase
  ) {}

  async execute(input: UpdatePostInput): Promise<PostRecord> {
    const post = await this.getPost.execute(input.postId, input.actorId)

    if (post.authorId !== input.actorId) {
      throw new ForbiddenError('You can only edit your own posts')
    }

    const updated = await this.posts.update(input.postId, {
      content: input.content,
      imageUrl: input.imageUrl,
      imageAlt: input.imageAlt
    })

    if (!updated) {
      throw new NotFoundError('Post not found')
    }

    return updated
  }
}
