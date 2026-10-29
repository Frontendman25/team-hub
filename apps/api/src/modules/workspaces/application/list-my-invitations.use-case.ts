import { Inject, Injectable } from '@nestjs/common'
import { UnauthorizedError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'

@Injectable()
export class ListMyInvitationsUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository
  ) {}

  async execute(actorId: string) {
    const email = await this.workspaces.findEmailById(actorId)
    if (!email) {
      throw new UnauthorizedError()
    }
    return this.workspaces.listPendingForEmail(email)
  }
}
