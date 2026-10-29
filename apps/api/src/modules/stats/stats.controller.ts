import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { count, eq } from 'drizzle-orm'
import { CurrentUser } from '../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../infrastructure/identity/session-auth.guard'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { comments } from '../../infrastructure/database/schema/comments'
import { posts } from '../../infrastructure/database/schema/posts'
import { workspaceMembers } from '../../infrastructure/database/schema/workspaces'
import { ZodValidationPipe } from '../../shared/presentation/zod-validation.pipe'
import { WorkspaceAccess } from '../workspaces/application/workspace-access'

const statsQuerySchema = z.object({
  workspaceId: z.string().uuid()
})

@Controller('stats')
@UseGuards(SessionAuthGuard)
export class StatsController {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly access: WorkspaceAccess
  ) {}

  @Get()
  async get(
    @CurrentUser() actorId: string,
    @Query(new ZodValidationPipe(statsQuerySchema))
    query: { workspaceId: string }
  ) {
    await this.access.requireMember(query.workspaceId, actorId)
    const db = this.drizzle.db
    const [usersRow] = await db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, query.workspaceId))
    const [postsRow] = await db
      .select({ value: count() })
      .from(posts)
      .where(eq(posts.workspaceId, query.workspaceId))
    const [commentsRow] = await db
      .select({ value: count() })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(eq(posts.workspaceId, query.workspaceId))

    return {
      users: Number(usersRow.value),
      posts: Number(postsRow.value),
      comments: Number(commentsRow.value)
    }
  }
}
