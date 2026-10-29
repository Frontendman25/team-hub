import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { CreateCommentUseCase } from '../application/create-comment.use-case'
import { DeleteCommentUseCase } from '../application/delete-comment.use-case'
import { ListCommentsUseCase } from '../application/list-comments.use-case'

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000)
})

@Controller()
@UseGuards(SessionAuthGuard)
export class CommentsController {
  constructor(
    private readonly listComments: ListCommentsUseCase,
    private readonly createComment: CreateCommentUseCase,
    private readonly deleteComment: DeleteCommentUseCase
  ) {}

  @Get('posts/:postId/comments')
  list(
    @CurrentUser() actorId: string,
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string
  ) {
    return this.listComments.execute(postId, actorId)
  }

  @Post('posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actorId: string,
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: { content: string }
  ) {
    return this.createComment.execute({
      postId,
      actorId,
      content: body.content
    })
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    await this.deleteComment.execute(id, actorId)
  }
}
