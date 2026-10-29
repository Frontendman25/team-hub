import { Inject, Injectable } from '@nestjs/common'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { DemoPolicy } from './demo-policy'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class DeleteWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(workspaceId: string, actorId: string): Promise<void> {
    await this.demo.assertNotFrozenDemo(workspaceId, actorId)
    await this.access.requireRole(workspaceId, actorId, 'owner')
    await this.workspaces.delete(workspaceId)
  }
}
