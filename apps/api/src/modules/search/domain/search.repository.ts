export const searchKinds = ['person', 'channel', 'post', 'message'] as const
export type SearchKind = (typeof searchKinds)[number]

export type SearchHitRecord = {
  kind: SearchKind
  id: string
  title: string
  snippet: string
  rank: number
  conversationId: string | null
  authorName: string | null
}

export type SearchQueryInput = {
  workspaceId: string
  actorId: string
  tsQuery: string
  perKind: number
  kinds: SearchKind[]
}

export interface SearchRepository {
  search(input: SearchQueryInput): Promise<SearchHitRecord[]>
}
