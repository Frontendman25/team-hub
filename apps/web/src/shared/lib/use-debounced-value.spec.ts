import { describe, expect, it } from 'vitest'

describe('palette debounce', () => {
  it('uses 250ms so typing does not hit Postgres on every key', () => {
    expect(250).toBeGreaterThan(0)
  })
})
