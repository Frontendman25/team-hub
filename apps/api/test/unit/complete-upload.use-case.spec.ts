import { describe, expect, it, vi } from 'vitest'
import { CompleteUploadUseCase } from '../../src/modules/files/application/complete-upload.use-case'
import type { FileAccess } from '../../src/modules/files/application/file-access'
import type { FilesRepository } from '../../src/modules/files/domain/files.repository'
import type { ObjectStorage } from '../../src/modules/files/domain/object-storage'
const fileId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const actorId = '11111111-1111-4111-8111-111111111111'

function pendingFile() {
  return {
    id: fileId,
    workspaceId: '88888888-8888-4888-8888-888888888888',
    uploadedBy: actorId,
    originalName: 'photo.jpg',
    contentType: 'image/jpeg',
    byteSize: 12,
    objectKey: 'workspaces/ws/files/id/photo.jpg',
    status: 'pending' as const,
    messageId: null,
    postId: null,
    conversationId: null,
    conversationType: null,
    createdAt: new Date(),
    uploadedAt: null,
    deletedAt: null,
    uploader: {
      id: actorId,
      displayName: 'Sarah',
      jobTitle: '',
      avatarUrl: null
    }
  }
}

describe('CompleteUploadUseCase', () => {
  it('fails when storage has no object', async () => {
    const files = {
      markFailed: vi.fn()
    } as unknown as FilesRepository
    const storage = {
      head: vi.fn().mockResolvedValue(null),
      delete: vi.fn()
    } as unknown as ObjectStorage
    const access = {
      requireFile: vi.fn().mockResolvedValue(pendingFile())
    } as unknown as FileAccess

    const useCase = new CompleteUploadUseCase(files, storage, access)
    await expect(useCase.execute({ fileId, actorId })).rejects.toMatchObject({
      code: 'UPLOAD_MISSING'
    })
    expect(files.markFailed).toHaveBeenCalledWith(fileId)
  })

  it('fails when declared size does not match storage', async () => {
    const files = {
      markFailed: vi.fn(),
      markReady: vi.fn()
    } as unknown as FilesRepository
    const storage = {
      head: vi.fn().mockResolvedValue({ byteSize: 99 }),
      delete: vi.fn().mockResolvedValue(undefined)
    } as unknown as ObjectStorage
    const access = {
      requireFile: vi.fn().mockResolvedValue(pendingFile())
    } as unknown as FileAccess

    const useCase = new CompleteUploadUseCase(files, storage, access)
    await expect(useCase.execute({ fileId, actorId })).rejects.toMatchObject({
      code: 'UPLOAD_MISMATCH'
    })
    expect(storage.delete).toHaveBeenCalled()
    expect(files.markReady).not.toHaveBeenCalled()
  })

  it('is idempotent when the file is already ready', async () => {
    const ready = { ...pendingFile(), status: 'ready' as const }
    const useCase = new CompleteUploadUseCase(
      {} as FilesRepository,
      {} as ObjectStorage,
      { requireFile: vi.fn().mockResolvedValue(ready) } as unknown as FileAccess
    )
    const result = await useCase.execute({ fileId, actorId })
    expect(result.status).toBe('ready')
  })
})
