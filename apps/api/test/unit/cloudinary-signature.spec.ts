import { describe, expect, it } from 'vitest'
import {
  cloudinaryDeliverySignature,
  cloudinaryUploadSignature
} from '../../src/modules/files/infrastructure/cloudinary-signature'
import { cloudinaryResourceType } from '../../src/modules/files/infrastructure/cloudinary-resource'

describe('cloudinary signatures', () => {
  it('matches the documented URL-safe SHA-1 prefix for delivery URLs', () => {
    const path = 'c_fill,w_300,h_250/e_grayscale/sample-authenticated.png'
    expect(cloudinaryDeliverySignature(path, 'abcd')).toBe('iDy_JeBq')
  })

  it('signs upload params in sorted query order', () => {
    expect(
      cloudinaryUploadSignature(
        { timestamp: 1315060510, public_id: 'sample', type: 'authenticated' },
        'abcd'
      )
    ).toMatch(/^[a-f0-9]{40}$/)
  })

  it('maps TeamHub MIME types to Cloudinary resource types', () => {
    expect(cloudinaryResourceType('image/jpeg')).toBe('image')
    expect(cloudinaryResourceType('application/pdf')).toBe('image')
    expect(cloudinaryResourceType('audio/webm')).toBe('video')
    expect(cloudinaryResourceType('video/mp4')).toBe('video')
    expect(
      cloudinaryResourceType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe('raw')
    expect(cloudinaryResourceType('text/plain')).toBe('raw')
  })
})
