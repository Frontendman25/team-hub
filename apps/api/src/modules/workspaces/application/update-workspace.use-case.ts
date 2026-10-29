import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, NotFoundError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { slugify } from './slug'
import { DemoPolicy } from './demo-policy'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class UpdateWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    name?: string
    description?: string
  }) {
    await this.demo.assertNotFrozenDemo(input.workspaceId, input.actorId)
    await this.access.requireRole(input.workspaceId, input.actorId, 'admin')
    const patch: { name?: string; description?: string; slug?: string } = {}
    if (input.name !== undefined) {
      patch.name = input.name.trim()
      const slug = slugify(patch.name)
      if (await this.workspaces.slugTaken(slug, input.workspaceId)) {
        throw new ConflictError('A workspace with this name already exists')
      }
      patch.slug = slug
    }
    if (input.description !== undefined) {
      patch.description = input.description.trim()
    }
    const updated = await this.workspaces.update(input.workspaceId, patch)
    if (!updated) {
      throw new NotFoundError('Workspace not found')
    }
    return updated
  }
}
