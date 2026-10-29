import { AppError } from '../../../shared/domain/errors'
import {
  ALLOWED_MIME_TYPES,
  AUDIO_MIME_TYPES,
  FILE_MAX_ATTACHMENTS,
  FILE_MAX_BYTES,
  FILE_MAX_MEDIA_BYTES,
  FILE_PENDING_TTL_MS,
  FILE_WORKSPACE_QUOTA_BYTES,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  type AllowedMimeType
} from '../files.constants'

export function normalizeContentType(value: string): string {
  return value.split(';')[0]?.trim().toLowerCase() ?? ''
}

export function maxBytesFor(contentType: string): number {
  const type = normalizeContentType(contentType)
  if (AUDIO_MIME_TYPES.has(type) || VIDEO_MIME_TYPES.has(type)) {
    return FILE_MAX_MEDIA_BYTES
  }
  return FILE_MAX_BYTES
}

export function assertAllowedUpload(input: {
  originalName: string
  contentType: string
  byteSize: number
}): asserts input is {
  originalName: string
  contentType: AllowedMimeType
  byteSize: number
} {
  const contentType = normalizeContentType(input.contentType)
  if (input.byteSize < 1) {
    throw new AppError('File is empty', 400, 'VALIDATION')
  }
  const limit = maxBytesFor(contentType)
  if (input.byteSize > limit) {
    throw new AppError(
      `File is larger than ${Math.round(limit / (1024 * 1024))} MB`,
      400,
      'VALIDATION'
    )
  }
  if (!(contentType in ALLOWED_MIME_TYPES)) {
    throw new AppError('This file type is not allowed', 400, 'VALIDATION')
  }
  const allowed = ALLOWED_MIME_TYPES[contentType as AllowedMimeType]
  const ext = input.originalName.split('.').pop()?.toLowerCase()
  if (!ext || !(allowed as readonly string[]).includes(ext)) {
    throw new AppError(
      'File extension does not match its type',
      400,
      'VALIDATION'
    )
  }
}

export function assertQuota(usedBytes: number, incomingBytes: number): void {
  if (usedBytes + incomingBytes > FILE_WORKSPACE_QUOTA_BYTES) {
    throw new AppError(
      'Workspace file quota would be exceeded',
      400,
      'QUOTA_EXCEEDED'
    )
  }
}

export function assertAttachmentCount(count: number): void {
  if (count > FILE_MAX_ATTACHMENTS) {
    throw new AppError(
      `At most ${FILE_MAX_ATTACHMENTS} files can be attached`,
      400,
      'VALIDATION'
    )
  }
}

export function isPendingExpired(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - createdAt.getTime() > FILE_PENDING_TTL_MS
}

export function isImageType(contentType: string): boolean {
  return IMAGE_MIME_TYPES.has(normalizeContentType(contentType))
}

export function isAudioType(contentType: string): boolean {
  return AUDIO_MIME_TYPES.has(normalizeContentType(contentType))
}

export function isVideoType(contentType: string): boolean {
  return VIDEO_MIME_TYPES.has(normalizeContentType(contentType))
}

export function contentDisposition(
  filename: string,
  contentType: string
): 'inline' | 'attachment' {
  return isImageType(contentType) ||
    isAudioType(contentType) ||
    isVideoType(contentType) ||
    contentType === 'application/pdf'
    ? 'inline'
    : 'attachment'
}
