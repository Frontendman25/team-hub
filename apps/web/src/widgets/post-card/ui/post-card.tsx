'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { DeletePostButton } from '@/features/delete-post/ui/delete-post-button'
import { EditPostForm } from '@/features/edit-post/ui/edit-post-form'
import { ReactionButton } from '@/features/react-to-post/ui/reaction-button'
import { RelativeTime } from '@/shared/ui/relative-time'
import { useUiStore } from '@/shared/model/ui-store'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { AttachmentGrid } from '@/features/upload-files/ui/attachment-card'
import { ImageLightbox } from '@/shared/ui/image-lightbox'
import type { Post, PublicUser } from '@/shared/types/api'

export function PostCard({
  post,
  me,
  href
}: {
  post: Post
  me: PublicUser | null | undefined
  href?: string
}) {
  const editingPostId = useUiStore((state) => state.editingPostId)
  const setEditingPostId = useUiStore((state) => state.setEditingPostId)
  const isOwner = Boolean(me && post.authorId === me.id)
  const editing = editingPostId === post.id
  const title = (
    <div className="min-w-0">
      <Link
        href={`/users/${post.author.id}`}
        className="font-semibold hover:underline"
      >
        {post.author.displayName}
      </Link>
      <p className="text-sm text-muted-foreground">
        {post.author.jobTitle} · <RelativeTime iso={post.createdAt} />
      </p>
    </div>
  )

  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <Avatar name={post.author.displayName} src={post.author.avatarUrl} />
          {title}
        </div>
        {isOwner ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => setEditingPostId(post.id)}
            >
              Edit
            </Button>
            <DeletePostButton postId={post.id} />
          </div>
        ) : null}
      </header>

      <div className="mt-3">
        {editing ? (
          <EditPostForm postId={post.id} initialContent={post.content} />
        ) : href ? (
          <Link href={href} className="block whitespace-pre-wrap text-[15px] leading-6">
            {post.content}
          </Link>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-6">{post.content}</p>
        )}
      </div>

      <AttachmentGrid files={post.attachments ?? []} />

      {post.imageUrl ? (
        <div className="mt-3 overflow-hidden rounded-xl">
          <ImageLightbox src={post.imageUrl} alt={post.imageAlt || 'Post image'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt=""
              className="max-h-80 w-full object-cover"
            />
          </ImageLightbox>
        </div>
      ) : null}

      <footer className="mt-4 flex items-center gap-4 text-muted-foreground">
        <ReactionButton post={post} canReact={Boolean(me)} />
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm hover:bg-muted"
          >
            <MessageCircle className="size-4" />
            {post.commentsCount}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <MessageCircle className="size-4" />
            {post.commentsCount}
          </span>
        )}
      </footer>
    </article>
  )
}
