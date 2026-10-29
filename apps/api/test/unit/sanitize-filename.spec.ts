import { describe, expect, it } from 'vitest'
import {
  objectKeyFor,
  sanitizeFilename
} from '../../src/modules/files/application/sanitize-filename'

describe('sanitizeFilename', () => {
  it('strips path segments and traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('C:\\\\Windows\\\\photo.png')).toBe('photo.png')
  })

  it('builds object keys from server ids only', () => {
    const key = objectKeyFor({
      workspaceId: '88888888-8888-4888-8888-888888888888',
      fileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      filename: 'report.pdf'
    })
    expect(key).toBe(
      'workspaces/88888888-8888-4888-8888-888888888888/files/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/report.pdf'
    )
  })
})
