export type MessageCursor = {
  createdAt: Date
  id: string
}

export function encodeMessageCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url')
}

export function decodeMessageCursor(cursor: string): MessageCursor | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const separator = decoded.lastIndexOf('|')
    if (separator <= 0) {
      return null
    }
    const createdAt = new Date(decoded.slice(0, separator))
    const id = decoded.slice(separator + 1)
    if (Number.isNaN(createdAt.getTime()) || id.length === 0) {
      return null
    }
    return { createdAt, id }
  } catch {
    return null
  }
}
