export const FILE_MAX_BYTES = 10 * 1024 * 1024
export const FILE_MAX_MEDIA_BYTES = 25 * 1024 * 1024
export const FILE_MAX_ATTACHMENTS = 5
export const FILE_WORKSPACE_QUOTA_BYTES = 200 * 1024 * 1024
export const FILE_PENDING_TTL_MS = 30 * 60 * 1000
export const FILE_UPLOAD_URL_TTL_SECONDS = 15 * 60
export const FILE_DOWNLOAD_URL_TTL_SECONDS = 60
export const AUDIO_MAX_SECONDS = 120
export const VIDEO_MAX_SECONDS = 30

export const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'text/plain': ['txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    'docx'
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'audio/webm': ['webm'],
  'audio/ogg': ['ogg', 'oga'],
  'audio/mp4': ['m4a', 'mp4'],
  'audio/mpeg': ['mp3', 'mpeg'],
  'audio/wav': ['wav'],
  'video/webm': ['webm'],
  'video/mp4': ['mp4', 'm4v'],
  'video/ogg': ['ogv', 'ogg']
} as const

export type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES

export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
])

export const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav'
])

export const VIDEO_MIME_TYPES = new Set([
  'video/webm',
  'video/mp4',
  'video/ogg'
])
