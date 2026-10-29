import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { CreatePostUseCase } from '../application/create-post.use-case'
import { DeletePostUseCase } from '../application/delete-post.use-case'
import { GetPostUseCase } from '../application/get-post.use-case'
import { ListPostsUseCase } from '../application/list-posts.use-case'
import { UpdatePostUseCase } from '../application/update-post.use-case'
import {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
  type CreatePostBody,
  type ListPostsQueryDto,
  type UpdatePostBody
} from './posts.schemas'

@Controller('posts')
@UseGuards(SessionAuthGuard)
export class PostsController {
  constructor(
    private readonly createPost: CreatePostUseCase,
    private readonly listPosts: ListPostsUseCase,
    private readonly getPost: GetPostUseCase,
    private readonly updatePost: UpdatePostUseCase,
    private readonly deletePost: DeletePostUseCase
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listPostsQuerySchema))
    query: ListPostsQueryDto,
    @CurrentUser() actorId: string
  ) {
    const result = await this.listPosts.execute({
      ...query,
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
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actorId: string
  ) {
    return this.getPost.execute(id, actorId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actorId: string,
    @Body(new ZodValidationPipe(createPostSchema)) body: CreatePostBody
  ) {
    return this.createPost.execute({
      actorId,
      workspaceId: body.workspaceId,
      content: body.content,
      imageUrl: body.imageUrl,
      imageAlt: body.imageAlt,
      attachmentIds: body.attachmentIds
    })
  }

  @Patch(':id')
  update(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updatePostSchema)) body: UpdatePostBody
  ) {
    return this.updatePost.execute({
      postId: id,
      actorId,
      content: body.content,
      imageUrl: body.imageUrl,
      imageAlt: body.imageAlt
    })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    await this.deletePost.execute(id, actorId)
  }
}
