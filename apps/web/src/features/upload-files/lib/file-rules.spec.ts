import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  isAudioType,
  isVideoType,
  validateLocalFile
} from './file-rules'

describe('validateLocalFile', () => {
  it('rejects empty, oversized, and svg files', () => {
    expect(validateLocalFile(new File([], 'empty.txt', { type: 'text/plain' }))).toMatch(
      /empty/
    )
    const huge = new File([new Uint8Array(11 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg'
    })
    expect(validateLocalFile(huge)).toMatch(/10 MB/)
    const svg = new File(['<svg></svg>'], 'x.svg', { type: 'image/svg+xml' })
    expect(validateLocalFile(svg)).toMatch(/not an allowed/)
  })

  it('allows recorded media up to 25 MB and strips codec suffixes for type checks', () => {
    const voice = new File([new Uint8Array(11 * 1024 * 1024)], 'voice.webm', {
      type: 'audio/webm'
    })
    expect(validateLocalFile(voice)).toBeNull()
    expect(isAudioType('audio/webm;codecs=opus')).toBe(true)
    expect(isVideoType('video/mp4')).toBe(true)
    const hugeClip = new File([new Uint8Array(26 * 1024 * 1024)], 'clip.webm', {
      type: 'video/webm'
    })
    expect(validateLocalFile(hugeClip)).toMatch(/25 MB/)
  })

  it('allows guest audio and video and still caps other demo files at 5 MB', () => {
    const clip = new File([new Uint8Array(1024)], 'clip.webm', {
      type: 'video/webm'
    })
    expect(validateLocalFile(clip, { guest: true })).toBeNull()
    const photo = new File([new Uint8Array(6 * 1024 * 1024)], 'shot.jpg', {
      type: 'image/jpeg'
    })
    expect(validateLocalFile(photo, { guest: true })).toMatch(/5 MB/)
  })

  it('formats byte sizes', () => {
    expect(formatBytes(800)).toBe('800 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
})
