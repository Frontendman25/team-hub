export type ByteRangeResult =
  | { type: 'all' }
  | { type: 'partial'; start: number; end: number }
  | { type: 'unsatisfiable' }

/** Single RFC 7233 `bytes=` range. Multiple ranges are ignored (full body). */
export function parseByteRange(
  header: string | undefined,
  size: number
): ByteRangeResult {
  if (!header || size <= 0) {
    return header && size <= 0 ? { type: 'unsatisfiable' } : { type: 'all' }
  }

  const trimmed = header.trim()
  const match = /^bytes=(\d*)-(\d*)$/i.exec(trimmed)
  if (!match) {
    return { type: 'all' }
  }

  const startRaw = match[1] ?? ''
  const endRaw = match[2] ?? ''
  if (startRaw === '' && endRaw === '') {
    return { type: 'unsatisfiable' }
  }

  if (startRaw === '') {
    const suffix = Number(endRaw)
    if (!Number.isSafeInteger(suffix) || suffix <= 0) {
      return { type: 'unsatisfiable' }
    }
    const start = Math.max(0, size - suffix)
    return { type: 'partial', start, end: size - 1 }
  }

  const start = Number(startRaw)
  if (!Number.isSafeInteger(start) || start < 0 || start >= size) {
    return { type: 'unsatisfiable' }
  }

  const end = endRaw === '' ? size - 1 : Math.min(size - 1, Number(endRaw))
  if (!Number.isSafeInteger(end) || end < start) {
    return { type: 'unsatisfiable' }
  }

  return { type: 'partial', start, end }
}
