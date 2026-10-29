import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards
} from '@nestjs/common'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { SearchWorkspaceUseCase } from '../application/search-workspace.use-case'
import { searchQuerySchema, type SearchQueryDto } from './search.schemas'

@Controller()
@UseGuards(SessionAuthGuard)
export class SearchController {
  constructor(private readonly searchWorkspace: SearchWorkspaceUseCase) {}

  @Get('workspaces/:workspaceId/search')
  search(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQueryDto
  ) {
    return this.searchWorkspace.execute({
      workspaceId,
      actorId,
      query: query.q,
      limit: query.limit,
      kinds: query.kinds
    })
  }
}
