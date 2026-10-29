export const CHANNEL_PREVIEW_COUNT = 5

export function previewChannels<T extends { id: string; name: string | null }>(
  channels: T[],
  expanded: boolean,
  activeId?: string,
  limit = CHANNEL_PREVIEW_COUNT
): { visible: T[]; hiddenCount: number } {
  const sorted = [...channels].sort((left, right) =>
    (left.name ?? '').localeCompare(right.name ?? '', undefined, {
      sensitivity: 'base'
    })
  )
  const hiddenCount = Math.max(0, sorted.length - limit)
  if (expanded || hiddenCount === 0) {
    return { visible: sorted, hiddenCount }
  }
  const head = sorted.slice(0, limit)
  const active = activeId
    ? sorted.find((row) => row.id === activeId)
    : undefined
  if (active && !head.some((row) => row.id === active.id)) {
    return { visible: [...head, active], hiddenCount }
  }
  return { visible: head, hiddenCount }
}
