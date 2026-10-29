'use client'

import { useQuery } from '@tanstack/react-query'
import { postQueries } from '@/entities/post/api/queries'
import { userQueries } from '@/entities/user/api/queries'
import { useCurrentWorkspace } from '@/entities/workspace/model/use-current-workspace'
import { ProfileSummary } from '@/widgets/profile-summary/ui/profile-summary'
import { PostCard } from '@/widgets/post-card/ui/post-card'
import { RightSidebar } from '@/widgets/right-sidebar/ui/right-sidebar'
import { Skeleton } from '@/shared/ui/skeleton'

export function ProfileView({ userId }: { userId: string }) {
  const user = useQuery(userQueries.detail(userId))
  const me = useQuery(userQueries.me())
  const { current } = useCurrentWorkspace()
  const posts = useQuery(postQueries.list(current?.id ?? '', userId))

  if (user.isLoading || !user.data) {
    return <Skeleton className="h-40" />
  }

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <ProfileSummary user={user.data} />
        {posts.data?.data.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            me={me.data}
            href={`/posts/${post.id}`}
          />
        ))}
      </div>
      <RightSidebar />
    </div>
  )
}
