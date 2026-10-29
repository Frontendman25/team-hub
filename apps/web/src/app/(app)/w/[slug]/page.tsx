import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { postQueries } from '@/entities/post/api/queries'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { Feed } from '@/widgets/feed/ui/feed'
import { RightSidebar } from '@/widgets/right-sidebar/ui/right-sidebar'
import type { Workspace } from '@/shared/types/api'

type Params = { slug: string }

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const workspace = await api.workspaces.get(slug)
    return { title: workspace.name }
  } catch {
    return { title: 'Workspace' }
  }
}

export default async function WorkspaceFeedPage({
  params,
  searchParams
}: {
  params: Promise<Params>
  searchParams: Promise<{ q?: string }>
}) {
  const { slug } = await params
  const { q } = await searchParams
  const queryClient = getServerQueryClient()
  let workspace: Workspace
  try {
    workspace = await api.workspaces.get(slug)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound()
    }
    throw error
  }

  await queryClient.prefetchQuery(workspaceQueries.detail(slug))
  await queryClient.prefetchInfiniteQuery(postQueries.infinite(workspace.id))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <Feed query={q} workspaceId={workspace.id} />
        </div>
        <RightSidebar />
      </div>
    </HydrationBoundary>
  )
}
