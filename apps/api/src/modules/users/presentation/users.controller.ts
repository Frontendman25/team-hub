import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { ListPostsUseCase } from '../../posts/application/list-posts.use-case'
import { listPostsQuerySchema } from '../../posts/presentation/posts.schemas'
import { GetUserUseCase } from '../application/get-user.use-case'
import { ListUsersUseCase } from '../application/list-users.use-case'

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12)
})

@Controller('users')
export class UsersController {
  constructor(
    private readonly getUser: GetUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly listPosts: ListPostsUseCase
  ) {}

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() userId: string) {
    return this.getUser.execute(userId, userId)
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: { limit: number }
  ) {
    return this.listUsers.execute(query.limit)
  }

  @Get(':id/posts')
  @UseGuards(SessionAuthGuard)
  async posts(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query(new ZodValidationPipe(listPostsQuerySchema))
    query: {
      workspaceId: string
      limit: number
      offset: number
    },
    @CurrentUser() actorId: string
  ) {
    await this.getUser.execute(id)
    const result = await this.listPosts.execute({
      ...query,
      authorId: id,
      actorId
    })
    return {
      data: result.items,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: result.total
      }
    }
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.getUser.execute(id)
  }
}
