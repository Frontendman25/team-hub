'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { commentQueries } from '@/entities/comment/api/queries'
import { userQueries } from '@/entities/user/api/queries'
import { CommentForm } from '@/features/comment-post/ui/comment-form'
import { DeleteCommentButton } from '@/features/comment-post/ui/delete-comment-button'
import { RelativeTime } from '@/shared/ui/relative-time'
import { Avatar } from '@/shared/ui/avatar'

export function CommentThread({ postId }: { postId: string }) {
  const comments = useQuery(commentQueries.byPost(postId))
  const me = useQuery(userQueries.me())

  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <h2 className="mb-4 font-semibold">Comments</h2>
      <ul className="space-y-4">
        {(comments.data ?? []).map((comment) => (
          <li key={comment.id} className="flex gap-3">
            <Avatar
              name={comment.author.displayName}
              src={comment.author.avatarUrl}
              size={32}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {comment.author.displayName}
                  <span className="ml-2 font-normal text-muted-foreground">
                    <RelativeTime iso={comment.createdAt} />
                  </span>
                </p>
                {me.data && comment.authorId === me.data.id ? (
                  <DeleteCommentButton
                    commentId={comment.id}
                    postId={postId}
                  />
                ) : null}
              </div>
              <p className="text-sm leading-6">{comment.content}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        {me.data ? (
          <CommentForm postId={postId} me={me.data} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>{' '}
            to comment.
          </p>
        )}
      </div>
    </section>
  )
}
