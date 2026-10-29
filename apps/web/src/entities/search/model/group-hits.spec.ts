import { describe, expect, it } from 'vitest'
import type { SearchHit } from '@/shared/types/api'
import { flattenGroupedHits, groupSearchHits } from './group-hits'

function hit(kind: SearchHit['kind'], title: string): SearchHit {
  return {
    kind,
    id: title,
    title,
    snippet: '',
    rank: 1,
    href: `/${kind}/${title}`,
    conversationId: null,
    authorName: null
  }
}

describe('groupSearchHits', () => {
  it('keeps palette section order and drops empty groups', () => {
    const grouped = groupSearchHits([
      hit('message', 'm'),
      hit('person', 'p'),
      hit('person', 'p2')
    ])
    expect(grouped.map((group) => group.kind)).toEqual(['person', 'message'])
    expect(flattenGroupedHits(grouped)).toHaveLength(3)
  })
})
