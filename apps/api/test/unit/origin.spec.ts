import { describe, expect, it } from 'vitest'
import {
  isMutatingMethod,
  originAllowed
} from '../../src/infrastructure/http/origin'

describe('originAllowed', () => {
  it('allows missing Origin for non-browser clients', () => {
    expect(originAllowed(undefined, 'http://localhost:3000')).toBe(true)
  })

  it('allows the configured frontend origin', () => {
    expect(
      originAllowed('http://localhost:3000', 'http://localhost:3000')
    ).toBe(true)
  })

  it('rejects a different origin', () => {
    expect(originAllowed('http://evil.example', 'http://localhost:3000')).toBe(
      false
    )
  })
})

describe('isMutatingMethod', () => {
  it('treats POST as mutating and GET as safe', () => {
    expect(isMutatingMethod('POST')).toBe(true)
    expect(isMutatingMethod('GET')).toBe(false)
  })
})
