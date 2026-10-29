import type { SearchHit, SearchKind } from '@/shared/types/api'

const ORDER: SearchKind[] = ['person', 'channel', 'post', 'message']

export const searchKindLabels: Record<SearchKind, string> = {
  person: 'People',
  channel: 'Channels',
  post: 'Posts',
  message: 'Messages'
}

export function groupSearchHits(
  hits: SearchHit[]
): { kind: SearchKind; label: string; hits: SearchHit[] }[] {
  return ORDER.flatMap((kind) => {
    const group = hits.filter((hit) => hit.kind === kind)
    return group.length > 0
      ? [{ kind, label: searchKindLabels[kind], hits: group }]
      : []
  })
}

export function flattenGroupedHits(
  groups: { hits: SearchHit[] }[]
): SearchHit[] {
  return groups.flatMap((group) => group.hits)
}
