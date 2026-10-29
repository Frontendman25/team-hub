import { afterEach, describe, expect, it } from 'vitest'
import { getSocketUrl } from './env'

const original = process.env.NEXT_PUBLIC_API_URL

describe('getSocketUrl', () => {
  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL
    } else {
      process.env.NEXT_PUBLIC_API_URL = original
    }
  })

  it('defaults to the local Nest origin when unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL
    expect(getSocketUrl()).toBe('http://localhost:3200')
  })

  it('uses same-origin sockets when NEXT_PUBLIC_API_URL is empty', () => {
    process.env.NEXT_PUBLIC_API_URL = ''
    expect(getSocketUrl()).toBe('')
  })
})
