import { describe, expect, it } from 'vitest'
import { toPrefixTsQuery } from '../../src/infrastructure/search/prefix-tsquery'

describe('toPrefixTsQuery', () => {
  it('tokenizes and prefixes for as-you-type matching', () => {
    expect(toPrefixTsQuery('Sarah Chen')).toBe('sarah:* & chen:*')
  })

  it('returns null when nothing searchable remains', () => {
    expect(toPrefixTsQuery('  & |  ')).toBeNull()
  })
})
