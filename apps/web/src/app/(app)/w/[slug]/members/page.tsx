import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { PageBackLink } from '@/shared/ui/page-back-link'
import { WorkspaceMembers } from '@/widgets/workspace-members/ui/workspace-members'
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
    return { title: `${workspace.name} members` }
  } catch {
    return { title: 'Members' }
  }
}

export default async function WorkspaceMembersPage({
  params
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const queryClient = getServerQueryClient()
  let workspace: Workspace
  try {
    workspace = await api.workspaces.get(slug)
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound()
    }
    throw error
  }

  await queryClient.prefetchQuery(workspaceQueries.detail(slug))
  await queryClient.prefetchQuery(workspaceQueries.members(workspace.id))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-4">
        <header className="space-y-2">
          <PageBackLink href={`/w/${workspace.slug}`}>Back to feed</PageBackLink>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Everyone in {workspace.name}
            {workspace.memberCount != null
              ? ` · ${workspace.memberCount}`
              : ''}
          </p>
        </header>
        <WorkspaceMembers
          workspaceId={workspace.id}
          slug={workspace.slug}
        />
      </div>
    </HydrationBoundary>
  )
}
