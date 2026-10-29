'use client'

import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { searchQueries } from '@/entities/search/api/queries'
import { flattenGroupedHits, groupSearchHits } from '@/entities/search/model/group-hits'
import { useCurrentWorkspace } from '@/entities/workspace/model/use-current-workspace'
import {
  SearchResults,
  searchHitKey
} from '@/features/search/ui/search-results'
import { ApiError } from '@/shared/lib/api'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
import { useUiStore } from '@/shared/model/ui-store'
import type { SearchHit } from '@/shared/types/api'

const EMPTY_HITS: SearchHit[] = []

export function CommandPalette() {
  const router = useRouter()
  const { current } = useCurrentWorkspace()
  const open = useUiStore((state) => state.searchOpen)
  const setSearchOpen = useUiStore((state) => state.setSearchOpen)
  const [draft, setDraft] = useState('')
  const query = useDebouncedValue(draft.trim(), 250)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [indexForQuery, setIndexForQuery] = useState(query)

  if (indexForQuery !== query) {
    setIndexForQuery(query)
    setActiveIndex(0)
  }

  const result = useQuery({
    ...searchQueries.workspace(current?.id ?? '', query),
    enabled: open && Boolean(current?.id) && query.length > 0
  })

  const hits = result.data ?? EMPTY_HITS
  const flat = useMemo(
    () => flattenGroupedHits(groupSearchHits(hits)),
    [hits]
  )
  const active = flat[activeIndex]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(!open)
        if (!open) {
          setDraft('')
          setActiveIndex(0)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setSearchOpen])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  const close = () => setSearchOpen(false)

  const go = (hit: SearchHit) => {
    close()
    router.push(hit.href)
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close search"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Workspace search"
        className="relative mx-auto mt-[12vh] w-full max-w-xl rounded-2xl border border-border bg-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              current
                ? `Search ${current.name}`
                : 'Join a workspace to search'
            }
            className="h-12 flex-1 bg-transparent text-sm outline-none"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                close()
                return
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((index) =>
                  Math.min(index + 1, Math.max(flat.length - 1, 0))
                )
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((index) => Math.max(index - 1, 0))
              }
              if (event.key === 'Enter' && active) {
                event.preventDefault()
                go(active)
              }
            }}
          />
          <kbd className="hidden rounded-md border border-border px-1.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
        <div className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
          {!current ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Search is limited to a workspace you belong to.
            </p>
          ) : draft.trim().length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Search people, channels, posts, and messages.
            </p>
          ) : result.isFetching ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          ) : result.isError ? (
            <p className="px-2 py-8 text-center text-sm text-red-600">
              {result.error instanceof ApiError
                ? result.error.message
                : 'Search failed'}
            </p>
          ) : hits.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No results for “{query}”.
            </p>
          ) : (
            <SearchResults
              hits={hits}
              activeKey={active ? searchHitKey(active) : undefined}
              onHover={(hit) =>
                setActiveIndex(
                  flat.findIndex(
                    (row) => searchHitKey(row) === searchHitKey(hit)
                  )
                )
              }
              onSelect={go}
            />
          )}
        </div>
      </div>
    </div>
  )
}
