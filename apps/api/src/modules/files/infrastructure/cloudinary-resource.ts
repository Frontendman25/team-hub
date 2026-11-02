import { IMAGE_MIME_TYPES } from '../files.constants'

export type CloudinaryResourceType = 'image' | 'video' | 'raw'

export function cloudinaryResourceType(
  contentType: string
): CloudinaryResourceType {
  if (IMAGE_MIME_TYPES.has(contentType) || contentType === 'application/pdf') {
    return 'image'
  }
  if (contentType.startsWith('audio/') || contentType.startsWith('video/')) {
    return 'video'
  }
  return 'raw'
}

export function cloudinaryPublicId(objectKey: string): string {
  return objectKey.replace(/^\/+/, '')
}
