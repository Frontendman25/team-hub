export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024
export const MAX_ATTACHMENTS = 5
export const GUEST_MAX_FILE_BYTES = 5 * 1024 * 1024

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'video/webm',
  'video/mp4',
  'video/ogg'
])

export function normalizeContentType(value: string): string {
  return value.split(';')[0]?.trim().toLowerCase() ?? ''
}

export function maxBytesFor(contentType: string): number {
  const type = normalizeContentType(contentType)
  if (type.startsWith('audio/') || type.startsWith('video/')) {
    return MAX_MEDIA_BYTES
  }
  return MAX_FILE_BYTES
}

export function validateLocalFile(
  file: File,
  options?: { guest?: boolean }
): string | null {
  const type = normalizeContentType(file.type)
  if (file.size < 1) {
    return `${file.name} is empty`
  }
  const media = type.startsWith('audio/') || type.startsWith('video/')
  const limit =
    options?.guest && !media
      ? Math.min(maxBytesFor(type), GUEST_MAX_FILE_BYTES)
      : maxBytesFor(type)
  if (file.size > limit) {
    return `${file.name} is larger than ${Math.round(limit / (1024 * 1024))} MB`
  }
  if (!ALLOWED_MIME_TYPES.has(type)) {
    return `${file.name} is not an allowed file type`
  }
  return null
}

export function isImageType(contentType: string): boolean {
  const type = normalizeContentType(contentType)
  return type.startsWith('image/') && type !== 'image/svg+xml'
}

export function isAudioType(contentType: string): boolean {
  return normalizeContentType(contentType).startsWith('audio/')
}

export function isVideoType(contentType: string): boolean {
  return normalizeContentType(contentType).startsWith('video/')
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
