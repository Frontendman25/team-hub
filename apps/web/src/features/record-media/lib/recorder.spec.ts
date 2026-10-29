import { describe, expect, it } from 'vitest'
import {
  blobToRecordingFile,
  formatClock,
  permissionErrorMessage,
  pickRecorderMime
} from './recorder'

describe('pickRecorderMime', () => {
  it('picks the first supported candidate', () => {
    const picked = pickRecorderMime(
      'audio',
      (mime) => mime === 'audio/mp4'
    )
    expect(picked?.contentType).toBe('audio/mp4')
    expect(picked?.extension).toBe('m4a')
  })

  it('returns null when nothing is supported', () => {
    expect(pickRecorderMime('video', () => false)).toBeNull()
  })
})

describe('formatClock', () => {
  it('formats elapsed time as m:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(1500)).toBe('0:01')
    expect(formatClock(125_000)).toBe('2:05')
  })
})

describe('permissionErrorMessage', () => {
  it('maps permission denial', () => {
    const denied = permissionErrorMessage(
      new DOMException('blocked', 'NotAllowedError')
    )
    expect(denied.status).toBe('denied')
    expect(denied.message).toMatch(/blocked/i)
  })

  it('maps missing devices and unsupported APIs', () => {
    expect(
      permissionErrorMessage(new DOMException('gone', 'NotFoundError')).status
    ).toBe('failed')
    expect(
      permissionErrorMessage(new DOMException('nope', 'NotSupportedError'))
        .status
    ).toBe('unsupported')
  })
})

describe('blobToRecordingFile', () => {
  it('uses the allowlisted content type, not the codec-suffixed MIME', () => {
    const file = blobToRecordingFile(
      new Blob(['x'], { type: 'audio/webm;codecs=opus' }),
      'audio',
      {
        mimeType: 'audio/webm;codecs=opus',
        contentType: 'audio/webm',
        extension: 'webm'
      }
    )
    expect(file.type).toBe('audio/webm')
    expect(file.name).toMatch(/^voice-.*\.webm$/)
  })
})
