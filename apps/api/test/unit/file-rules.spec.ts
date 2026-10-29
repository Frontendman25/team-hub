import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/shared/domain/errors'
import {
  assertAllowedUpload,
  contentDisposition,
  maxBytesFor,
  normalizeContentType
} from '../../src/modules/files/application/file-rules'

describe('assertAllowedUpload', () => {
  it('rejects SVG and HTML even if named as images', () => {
    expect(() =>
      assertAllowedUpload({
        originalName: 'icon.svg',
        contentType: 'image/svg+xml',
        byteSize: 120
      })
    ).toThrow(AppError)
    expect(() =>
      assertAllowedUpload({
        originalName: 'page.html',
        contentType: 'text/html',
        byteSize: 120
      })
    ).toThrow(AppError)
  })

  it('accepts jpeg with a matching extension', () => {
    expect(() =>
      assertAllowedUpload({
        originalName: 'photo.jpg',
        contentType: 'image/jpeg',
        byteSize: 2048
      })
    ).not.toThrow()
  })

  it('rejects extension/MIME mismatch', () => {
    expect(() =>
      assertAllowedUpload({
        originalName: 'photo.exe',
        contentType: 'image/jpeg',
        byteSize: 2048
      })
    ).toThrow(AppError)
  })

  it('accepts recorded audio/video after codec parameters are stripped', () => {
    expect(normalizeContentType('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(() =>
      assertAllowedUpload({
        originalName: 'voice-note.webm',
        contentType: 'audio/webm;codecs=opus',
        byteSize: 12 * 1024 * 1024
      })
    ).not.toThrow()
    expect(() =>
      assertAllowedUpload({
        originalName: 'clip.mp4',
        contentType: 'video/mp4',
        byteSize: 20 * 1024 * 1024
      })
    ).not.toThrow()
    expect(() =>
      assertAllowedUpload({
        originalName: 'clip.webm',
        contentType: 'video/webm',
        byteSize: 26 * 1024 * 1024
      })
    ).toThrow(AppError)
    expect(maxBytesFor('image/jpeg')).toBe(10 * 1024 * 1024)
    expect(maxBytesFor('audio/webm')).toBe(25 * 1024 * 1024)
  })

  it('serves audio and video inline so the browser can play them', () => {
    expect(contentDisposition('voice.webm', 'audio/webm')).toBe('inline')
    expect(contentDisposition('clip.mp4', 'video/mp4')).toBe('inline')
    expect(
      contentDisposition(
        'notes.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe('attachment')
  })
})
