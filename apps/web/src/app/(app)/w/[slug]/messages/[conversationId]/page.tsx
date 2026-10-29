import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { conversationQueries } from '@/entities/conversation/api/queries'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { Messenger } from '@/widgets/messenger/ui/messenger'
import type { Workspace } from '@/shared/types/api'

type Params = { slug: string; conversationId: string }

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const workspace = await api.workspaces.get(slug)
    return { title: `${workspace.name} messages` }
  } catch {
    return { title: 'Messages' }
  }
}

export default async function ConversationPage({
  params
}: {
  params: Promise<Params>
}) {
  const { slug, conversationId } = await params
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
  await queryClient.prefetchQuery(conversationQueries.list(workspace.id))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Messenger
        workspaceId={workspace.id}
        slug={slug}
        conversationId={conversationId}
        role={workspace.role ?? 'member'}
        demoWorkspace={workspace.kind === 'demo'}
      />
    </HydrationBoundary>
  )
}
