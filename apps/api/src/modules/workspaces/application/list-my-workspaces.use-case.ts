import { Inject, Injectable } from '@nestjs/common'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'

@Injectable()
export class ListMyWorkspacesUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository
  ) {}

  execute(userId: string) {
    return this.workspaces.listForUser(userId)
  }
}
