import { and, inArray, isNull, eq } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { files } from '../../../infrastructure/database/schema/files'
import { ConflictError } from '../../../shared/domain/errors'
import { FILE_MAX_ATTACHMENTS } from '../files.constants'

export async function attachReadyFilesInTx(
  tx: Database,
  data: {
    workspaceId: string
    actorId: string
    fileIds: string[]
    messageId?: string
    postId?: string
  }
): Promise<void> {
  if (data.fileIds.length === 0) {
    return
  }
  if (data.fileIds.length > FILE_MAX_ATTACHMENTS) {
    throw new ConflictError('Too many attachments')
  }
  const unique = [...new Set(data.fileIds)]
  if (unique.length !== data.fileIds.length) {
    throw new ConflictError('Duplicate attachment ids')
  }
  const updated = await tx
    .update(files)
    .set({
      messageId: data.messageId ?? null,
      postId: data.postId ?? null
    })
    .where(
      and(
        inArray(files.id, unique),
        eq(files.workspaceId, data.workspaceId),
        eq(files.uploadedBy, data.actorId),
        eq(files.status, 'ready'),
        isNull(files.messageId),
        isNull(files.postId),
        isNull(files.deletedAt)
      )
    )
    .returning({ id: files.id })
  if (updated.length !== unique.length) {
    throw new ConflictError(
      'One or more files could not be attached. Upload them again.'
    )
  }
}
