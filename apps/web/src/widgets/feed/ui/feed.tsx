'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { CreatePostComposer } from '@/features/create-post/ui/composer'
import { FEED_PAGE_SIZE, postQueries } from '@/entities/post/api/queries'
import { userQueries } from '@/entities/user/api/queries'
import { PostCard } from '@/widgets/post-card/ui/post-card'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

export function Feed({
  query,
  workspaceId
}: {
  query?: string
  workspaceId: string
}) {
  const posts = useInfiniteQuery(postQueries.infinite(workspaceId))
  const me = useQuery(userQueries.me())

  if (posts.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (posts.isError) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-sm">
        <p className="text-red-600">Could not load the feed.</p>
        <Button className="mt-3" onClick={() => void posts.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const items = (posts.data?.pages ?? []).flatMap((page) => page.data)
  const total = posts.data?.pages[0]?.pagination.total ?? items.length
  const filtered = items.filter((post) => {
    if (!query) {
      return true
    }
    const haystack = `${post.content} ${post.author.displayName}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div className="space-y-4">
      {me.data ? (
        <CreatePostComposer me={me.data} workspaceId={workspaceId} />
      ) : null}
      {filtered.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          me={me.data}
          href={`/posts/${post.id}`}
        />
      ))}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-muted-foreground">
          No posts in this workspace yet. Share an update to get the feed
          started.
        </p>
      ) : null}
      {!query && total > 0 ? (
        <div className="flex flex-col items-center gap-3 pb-6 pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {items.length} of {total}
          </p>
          {posts.hasNextPage ? (
            <button
              type="button"
              disabled={posts.isFetchingNextPage}
              onClick={() => void posts.fetchNextPage()}
              className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full border border-border bg-white px-5 text-sm font-semibold shadow-sm transition hover:border-accent hover:bg-accent/20 disabled:opacity-60"
            >
              <ChevronDown className="size-4" />
              {posts.isFetchingNextPage
                ? 'Loading more posts…'
                : `Load ${FEED_PAGE_SIZE} more posts`}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {total - items.length} left
              </span>
            </button>
          ) : items.length > FEED_PAGE_SIZE ? (
            <p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              You are at the end
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
