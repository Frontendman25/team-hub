import { Module } from '@nestjs/common'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { StatsController } from './stats.controller'

@Module({
  imports: [WorkspacesModule],
  controllers: [StatsController]
})
export class StatsModule {}
