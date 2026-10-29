import { Inject, Injectable } from '@nestjs/common'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { FilesRepository } from '../domain/files.repository'
import { FILES_REPOSITORY } from '../files.tokens'
import { serializeFile } from './serialize-file'

@Injectable()
export class ListWorkspaceFilesUseCase {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly files: FilesRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    limit: number
    offset: number
  }) {
    const { workspace } = await this.access.requireMember(
      input.workspaceId,
      input.actorId
    )
    const result = await this.files.listWorkspace({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      limit: input.limit,
      offset: input.offset
    })
    return {
      items: result.items.map((file) => ({
        ...serializeFile(file),
        source: sourceFor(file, workspace.slug)
      })),
      total: result.total
    }
  }
}

function sourceFor(
  file: {
    messageId: string | null
    postId: string | null
    conversationId: string | null
    conversationType: string | null
  },
  slug: string
) {
  if (file.postId) {
    return {
      kind: 'post' as const,
      id: file.postId,
      label: 'Feed post',
      href: `/posts/${file.postId}`
    }
  }
  if (file.messageId && file.conversationId) {
    return {
      kind: 'message' as const,
      id: file.messageId,
      label:
        file.conversationType === 'dm' ? 'Direct message' : 'Channel message',
      href: `/w/${slug}/messages/${file.conversationId}`
    }
  }
  return null
}
