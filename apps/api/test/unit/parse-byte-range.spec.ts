import { describe, expect, it } from 'vitest'
import { parseByteRange } from '../../src/modules/files/application/parse-byte-range'

describe('parseByteRange', () => {
  it('returns the full body when Range is absent', () => {
    expect(parseByteRange(undefined, 100)).toEqual({ type: 'all' })
  })

  it('parses a closed interval', () => {
    expect(parseByteRange('bytes=0-4', 12)).toEqual({
      type: 'partial',
      start: 0,
      end: 4
    })
  })

  it('parses an open end as through the last byte', () => {
    expect(parseByteRange('bytes=8-', 12)).toEqual({
      type: 'partial',
      start: 8,
      end: 11
    })
  })

  it('parses a suffix length', () => {
    expect(parseByteRange('bytes=-3', 12)).toEqual({
      type: 'partial',
      start: 9,
      end: 11
    })
  })

  it('rejects a start past the object size', () => {
    expect(parseByteRange('bytes=12-20', 12)).toEqual({
      type: 'unsatisfiable'
    })
  })
})
