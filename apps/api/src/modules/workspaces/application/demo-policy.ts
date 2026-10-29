import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import {
  DEMO_FROZEN_MESSAGE,
  DEMO_OWN_CONTENT_MESSAGE,
  GUEST_FILE_MAX_BYTES,
  GUEST_REGISTER_MESSAGE,
  type AccountKind
} from '../../demo/demo.constants'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'

export type DemoActor = {
  id: string
  accountKind: AccountKind
  guestExpiresAt: Date | null
}

@Injectable()
export class DemoPolicy {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository
  ) {}

  async actor(userId: string): Promise<DemoActor> {
    const user = await this.workspaces.findAccount(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }
    return user
  }

  async isDemoWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = await this.workspaces.findById(workspaceId)
    return workspace?.kind === 'demo'
  }

  async assertCanCreateWorkspace(actorId: string): Promise<void> {
    const actor = await this.actor(actorId)
    if (actor.accountKind === 'guest') {
      throw new ForbiddenError(GUEST_REGISTER_MESSAGE)
    }
  }

  async isVisitor(userId: string): Promise<boolean> {
    const actor = await this.actor(userId)
    return actor.accountKind !== 'demo_persona'
  }

  async assertNotFrozenDemo(
    workspaceId: string,
    actorId: string
  ): Promise<void> {
    if (!(await this.isDemoWorkspace(workspaceId))) {
      return
    }
    if (await this.isVisitor(actorId)) {
      throw new ForbiddenError(DEMO_FROZEN_MESSAGE)
    }
  }

  async assertCanOpenDm(workspaceId: string, actorId: string): Promise<void> {
    if (!(await this.isDemoWorkspace(workspaceId))) {
      return
    }
    const actor = await this.actor(actorId)
    if (actor.accountKind === 'guest') {
      throw new ForbiddenError(GUEST_REGISTER_MESSAGE)
    }
  }

  async assertOwnInDemo(input: {
    workspaceId: string
    actorId: string
    ownerId: string
  }): Promise<void> {
    if (!(await this.isDemoWorkspace(input.workspaceId))) {
      return
    }
    if (!(await this.isVisitor(input.actorId))) {
      return
    }
    if (input.ownerId !== input.actorId) {
      throw new ForbiddenError(DEMO_OWN_CONTENT_MESSAGE)
    }
  }

  async assertGuestUpload(input: {
    actorId: string
    contentType: string
    byteSize: number
  }): Promise<void> {
    const actor = await this.actor(input.actorId)
    if (actor.accountKind !== 'guest') {
      return
    }
    const type = input.contentType.split(';')[0]?.trim().toLowerCase() ?? ''
    const media = type.startsWith('audio/') || type.startsWith('video/')
    if (!media && input.byteSize > GUEST_FILE_MAX_BYTES) {
      throw new ForbiddenError('Demo uploads are limited to 5 MB')
    }
  }
}
