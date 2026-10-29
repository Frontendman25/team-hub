const UNSAFE = /[\u0000-\u001f\u007f\\/:*?"<>|]+/g

export function sanitizeFilename(original: string): string {
  const base = original.split(/[/\\]/).pop()?.trim() || 'file'
  const cleaned = base.replace(UNSAFE, '_').replace(/^\.+/, '_').slice(0, 180)
  return cleaned.length > 0 ? cleaned : 'file'
}

export function objectKeyFor(input: {
  workspaceId: string
  fileId: string
  filename: string
}): string {
  return `workspaces/${input.workspaceId}/files/${input.fileId}/${sanitizeFilename(input.filename)}`
}
