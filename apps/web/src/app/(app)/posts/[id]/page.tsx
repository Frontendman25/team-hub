import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { commentQueries } from '@/entities/comment/api/queries'
import { postQueries } from '@/entities/post/api/queries'
import { userQueries } from '@/entities/user/api/queries'
import { api } from '@/shared/api/client'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { PostCard } from '@/widgets/post-card/ui/post-card'
import { CommentThread } from '@/widgets/comment-thread/ui/comment-thread'
import { RightSidebar } from '@/widgets/right-sidebar/ui/right-sidebar'
import { WorkspaceBackLink } from '@/shared/ui/workspace-back-link'
import { ApiError } from '@/shared/lib/api'
import type { Post, PublicUser } from '@/shared/types/api'

type Params = { id: string }

export async function generateMetadata({
  params
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const post = await api.posts.get(id)
    const title = post.content.slice(0, 60)
    return {
      title,
      description: post.content.slice(0, 160),
      alternates: { canonical: `/posts/${id}` },
      openGraph: {
        type: 'article',
        title,
        description: post.content.slice(0, 160)
      }
    }
  } catch {
    return { title: 'Post not found' }
  }
}

export const dynamic = 'force-dynamic'

export default async function PostPage({
  params
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const queryClient = getServerQueryClient()

  try {
    await Promise.all([
      queryClient.prefetchQuery(postQueries.detail(id)),
      queryClient.prefetchQuery(commentQueries.byPost(id)),
      queryClient.prefetchQuery(userQueries.me())
    ])
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }

  const post = queryClient.getQueryData<Post>(postQueries.detail(id).queryKey)

  if (!post) {
    notFound()
  }

  const me = queryClient.getQueryData<PublicUser | null>(
    userQueries.me().queryKey
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1 space-y-4">
          <WorkspaceBackLink>Back to feed</WorkspaceBackLink>
          <PostCard post={post} me={me} />
          <CommentThread postId={id} />
        </div>
        <RightSidebar />
      </div>
    </HydrationBoundary>
  )
}
