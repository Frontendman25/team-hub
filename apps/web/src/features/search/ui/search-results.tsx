'use client'

import { Hash, MessageCircle, Newspaper, UserRound } from 'lucide-react'
import type { SearchHit, SearchKind } from '@/shared/types/api'
import { cn } from '@/shared/lib/cn'
import { groupSearchHits } from '@/entities/search/model/group-hits'

const icons: Record<SearchKind, typeof Hash> = {
  person: UserRound,
  channel: Hash,
  post: Newspaper,
  message: MessageCircle
}

export function searchHitKey(hit: SearchHit): string {
  return `${hit.kind}:${hit.id}`
}

export function SearchResults({
  hits,
  activeKey,
  onHover,
  onSelect
}: {
  hits: SearchHit[]
  activeKey?: string
  onHover?: (hit: SearchHit) => void
  onSelect: (hit: SearchHit) => void
}) {
  const groups = groupSearchHits(hits)

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <section key={group.kind}>
          <p className="px-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">
            {group.label}
          </p>
          <ul>
            {group.hits.map((hit) => {
              const Icon = icons[hit.kind]
              const key = searchHitKey(hit)
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm',
                      activeKey === key ? 'bg-accent/70' : 'hover:bg-muted'
                    )}
                    onMouseEnter={() => onHover?.(hit)}
                    onClick={() => onSelect(hit)}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{hit.title}</span>
                      {hit.snippet ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {hit.authorName ? `${hit.authorName} · ` : ''}
                          {hit.snippet}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
