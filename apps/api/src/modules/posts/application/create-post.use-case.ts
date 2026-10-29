import { Inject, Injectable } from '@nestjs/common'
import { GuestWriteLimiter } from '../../auth/infrastructure/guest-write-limiter'
import { HydrateAttachments } from '../../files/application/hydrate-attachments'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type {
  CreatePostData,
  PostRecord,
  PostRepository
} from '../domain/post.repository'
import { POSTS_REPOSITORY } from '../posts.tokens'

export type CreatePostInput = Omit<CreatePostData, 'authorId'> & {
  actorId: string
}

@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly posts: PostRepository,
    private readonly access: WorkspaceAccess,
    private readonly attachments: HydrateAttachments,
    private readonly demo: DemoPolicy,
    private readonly guestWrites: GuestWriteLimiter
  ) {}

  async execute(input: CreatePostInput): Promise<PostRecord> {
    await this.access.requireMember(input.workspaceId, input.actorId)
    await this.guestWrites.assertFor(this.demo, input.actorId)
    const post = await this.posts.create({
      workspaceId: input.workspaceId,
      authorId: input.actorId,
      content: input.content,
      imageUrl: input.imageUrl ?? null,
      imageAlt: input.imageAlt ?? null,
      attachmentIds: input.attachmentIds ?? []
    })
    return this.attachments.post(post)
  }
}
