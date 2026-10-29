import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards
} from '@nestjs/common'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { AddReactionUseCase } from '../application/add-reaction.use-case'
import { RemoveReactionUseCase } from '../application/remove-reaction.use-case'

@Controller('posts/:postId/reactions')
@UseGuards(SessionAuthGuard)
export class ReactionsController {
  constructor(
    private readonly addReaction: AddReactionUseCase,
    private readonly removeReaction: RemoveReactionUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  add(
    @CurrentUser() actorId: string,
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string
  ) {
    return this.addReaction.execute(postId, actorId)
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() actorId: string,
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string
  ) {
    return this.removeReaction.execute(postId, actorId)
  }
}
