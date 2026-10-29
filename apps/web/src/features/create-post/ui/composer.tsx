'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { fileKeys } from '@/entities/file/api/queries'
import { postKeys } from '@/entities/post/api/queries'
import { FileDropzone } from '@/features/upload-files/ui/file-dropzone'
import { AttachmentGrid } from '@/features/upload-files/ui/attachment-card'
import { MAX_ATTACHMENTS } from '@/features/upload-files/lib/file-rules'
import { uploadWorkspaceFile } from '@/features/upload-files/lib/upload-file'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Avatar } from '@/shared/ui/avatar'
import { useUiStore } from '@/shared/model/ui-store'
import type { FileAttachment, PublicUser } from '@/shared/types/api'

const schema = z.object({
  content: z.string().trim().max(5000)
})

export function CreatePostComposer({
  me,
  workspaceId
}: {
  me: PublicUser
  workspaceId: string
}) {
  const queryClient = useQueryClient()
  const composerOpen = useUiStore((state) => state.composerOpen)
  const setComposerOpen = useUiStore((state) => state.setComposerOpen)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [uploading, setUploading] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      api.posts.create({
        workspaceId,
        content,
        attachmentIds: attachments.map((file) => file.id)
      }),
    onSuccess: async () => {
      setContent('')
      setAttachments([])
      setError(null)
      setComposerOpen(false)
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
      await queryClient.invalidateQueries({ queryKey: fileKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })

  async function addFiles(files: File[]) {
    setUploading(true)
    setError(null)
    try {
      const uploaded = await Promise.all(
        files.map((file) => uploadWorkspaceFile(workspaceId, file))
      )
      setAttachments((current) => [...current, ...uploaded].slice(0, MAX_ATTACHMENTS))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function submit() {
    const parsed = schema.safeParse({ content })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid post')
      return
    }
    if (!parsed.data.content && attachments.length === 0) {
      setError('Write something or attach a file')
      return
    }
    mutation.mutate()
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar name={me.displayName} src={me.avatarUrl} />
        <Textarea
          rows={composerOpen ? 4 : 2}
          placeholder={`What's on your mind, ${me.displayName.split(' ')[0]}?`}
          value={content}
          onFocus={() => setComposerOpen(true)}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>
      {composerOpen ? (
        <div className="mt-3 space-y-2">
          <FileDropzone
            remaining={MAX_ATTACHMENTS - attachments.length}
            disabled={uploading || mutation.isPending}
            onFiles={(files) => void addFiles(files)}
          />
          <AttachmentGrid
            files={attachments}
            canRemove
            onRemove={(id) =>
              setAttachments((current) => current.filter((file) => file.id !== id))
            }
          />
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <Button onClick={submit} disabled={mutation.isPending || uploading}>
          {mutation.isPending ? 'Posting…' : uploading ? 'Uploading…' : 'Post'}
        </Button>
      </div>
    </section>
  )
}
