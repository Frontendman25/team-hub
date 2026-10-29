'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { fileKeys, fileQueries } from '@/entities/file/api/queries'
import { userQueries } from '@/entities/user/api/queries'
import { AttachmentCard } from '@/features/upload-files/ui/attachment-card'
import { formatBytes } from '@/features/upload-files/lib/file-rules'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'
import { RelativeTime } from '@/shared/ui/relative-time'
import { Skeleton } from '@/shared/ui/skeleton'

export function WorkspaceFiles({
  workspaceId,
  canModerate
}: {
  workspaceId: string
  canModerate: boolean
}) {
  const queryClient = useQueryClient()
  const me = useQuery(userQueries.me())
  const files = useQuery(fileQueries.list(workspaceId))
  const remove = useMutation({
    mutationFn: (id: string) => api.files.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fileKeys.list(workspaceId) })
    }
  })

  if (files.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (files.isError) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-sm">
        <p className="text-red-600">Could not load files.</p>
        <Button className="mt-3" onClick={() => void files.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const items = files.data?.data ?? []
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
        No files in this workspace yet. Attach images or documents to a message
        or post.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((file) => {
        const canRemove =
          me.data?.id === file.uploader.id || canModerate
        return (
          <article
            key={file.id}
            className="rounded-2xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-medium">{file.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {file.uploader.displayName} · {formatBytes(file.byteSize)} ·{' '}
                  <RelativeTime iso={file.createdAt} />
                </p>
              </div>
              {file.source ? (
                <Link
                  href={file.source.href}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Open {file.source.label}
                </Link>
              ) : null}
            </div>
            <AttachmentCard
              file={file}
              canRemove={canRemove}
              onRemove={() => remove.mutate(file.id)}
            />
          </article>
        )
      })}
    </div>
  )
}
