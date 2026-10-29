import { Inject, Injectable } from '@nestjs/common'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { DemoPolicy } from './demo-policy'
import { slugify, uniqueSlug } from './slug'

@Injectable()
export class CreateWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    actorId: string
    name: string
    description?: string
  }) {
    await this.demo.assertCanCreateWorkspace(input.actorId)
    let slug = slugify(input.name)
    if (await this.workspaces.slugTaken(slug)) {
      slug = uniqueSlug(slug)
    }

    return this.workspaces.create({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() ?? '',
      createdById: input.actorId
    })
  }
}
