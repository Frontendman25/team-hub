import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import { hasAtLeast } from '../../workspaces/domain/roles'
import type { FileRecord } from '../domain/file.record'
import type { FilesRepository } from '../domain/files.repository'
import { FILES_REPOSITORY } from '../files.tokens'

@Injectable()
export class FileAccess {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly files: FilesRepository,
    private readonly workspaces: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async requireFile(id: string): Promise<FileRecord> {
    const file = await this.files.findById(id)
    if (!file || file.status === 'deleted' || file.deletedAt) {
      throw new NotFoundError('File not found')
    }
    return file
  }

  async requireReadable(fileId: string, actorId: string): Promise<FileRecord> {
    const file = await this.requireFile(fileId)
    await this.workspaces.requireMember(file.workspaceId, actorId)
    if (file.status !== 'ready' || (!file.messageId && !file.postId)) {
      if (file.uploadedBy !== actorId) {
        throw new NotFoundError('File not found')
      }
      if (file.status !== 'ready') {
        return file
      }
    }
    if (file.conversationType === 'dm' && file.conversationId) {
      const member = await this.files.isConversationMember(
        file.conversationId,
        actorId
      )
      if (!member) {
        throw new NotFoundError('File not found')
      }
    }
    return file
  }

  async requireReadyDownload(
    fileId: string,
    actorId: string
  ): Promise<FileRecord> {
    const file = await this.requireReadable(fileId, actorId)
    if (file.status !== 'ready') {
      throw new NotFoundError('File not found')
    }
    return file
  }

  async requireMutable(fileId: string, actorId: string): Promise<FileRecord> {
    const file = await this.requireReadable(fileId, actorId)
    const access = await this.workspaces.requireMember(
      file.workspaceId,
      actorId
    )
    await this.demo.assertOwnInDemo({
      workspaceId: file.workspaceId,
      actorId,
      ownerId: file.uploadedBy
    })
    if (file.uploadedBy === actorId || hasAtLeast(access.role, 'admin')) {
      return file
    }
    throw new ForbiddenError('You cannot remove this file')
  }
}
