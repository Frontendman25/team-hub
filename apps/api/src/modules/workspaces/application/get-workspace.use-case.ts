import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { WorkspaceAccess } from './workspace-access'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

@Injectable()
export class GetWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(ref: string, actorId: string) {
    const workspace = UUID_RE.test(ref)
      ? await this.workspaces.findById(ref)
      : await this.workspaces.findBySlug(ref)
    if (!workspace) {
      throw new NotFoundError('Workspace not found')
    }
    const { role } = await this.access.requireMember(workspace.id, actorId)
    return { ...workspace, role }
  }
}
