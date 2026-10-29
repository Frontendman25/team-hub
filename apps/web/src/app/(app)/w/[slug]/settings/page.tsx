import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { WorkspaceSettings } from '@/widgets/workspace-settings/ui/workspace-settings'
import type { Workspace } from '@/shared/types/api'

type Params = { slug: string }

export const dynamic = 'force-dynamic'

export default async function WorkspaceSettingsPage({
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

  const tasks = [
    queryClient.prefetchQuery(workspaceQueries.detail(slug)),
    queryClient.prefetchQuery(workspaceQueries.members(workspace.id))
  ]
  if (workspace.role === 'owner' || workspace.role === 'admin') {
    tasks.push(queryClient.prefetchQuery(workspaceQueries.invitations(workspace.id)))
  }
  await Promise.all(tasks)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkspaceSettings workspace={workspace} />
    </HydrationBoundary>
  )
}
