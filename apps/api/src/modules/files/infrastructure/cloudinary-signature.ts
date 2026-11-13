import { createHash } from 'node:crypto'

export function cloudinaryUploadSignature(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

export function cloudinaryDeliverySignature(
  pathAfterSignature: string,
  apiSecret: string
): string {
  const digest = createHash('sha1')
    .update(`${pathAfterSignature}${apiSecret}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return digest.slice(0, 8)
}

export function signedAuthenticatedDeliveryUrl(input: {
  cloudName: string
  resourceType: 'image' | 'video' | 'raw'
  publicId: string
  format?: string
  apiSecret: string
}): string {
  // For image/video the extension is separate from the public ID, even when
  // that ID already ends in e.g. '.webm'. Raw IDs include their own extension.
  const toSign =
    input.resourceType !== 'raw' && input.format
      ? `${input.publicId}.${input.format}`
      : input.publicId
  const signature = cloudinaryDeliverySignature(toSign, input.apiSecret)
  return `https://res.cloudinary.com/${input.cloudName}/${input.resourceType}/authenticated/s--${signature}--/${toSign}`
}
