import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { SearchWorkspaceUseCase } from './application/search-workspace.use-case'
import type { SearchRepository } from './domain/search.repository'
import { DrizzleSearchRepository } from './infrastructure/drizzle-search.repository'
import { SearchController } from './presentation/search.controller'
import { SEARCH_REPOSITORY } from './search.tokens'

@Module({
  imports: [WorkspacesModule],
  controllers: [SearchController],
  providers: [
    {
      provide: SEARCH_REPOSITORY,
      useFactory: (drizzle: DrizzleService): SearchRepository =>
        new DrizzleSearchRepository(drizzle.db),
      inject: [DrizzleService]
    },
    SearchWorkspaceUseCase
  ],
  exports: [SearchWorkspaceUseCase]
})
export class SearchModule {}
