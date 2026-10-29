'use client'

import { Download, FileText, X } from 'lucide-react'
import type { FileAttachment } from '@/shared/types/api'
import { ImageLightbox } from '@/shared/ui/image-lightbox'
import { formatBytes, isAudioType, isImageType, isVideoType } from '../lib/file-rules'
import { contentSrc, downloadAttachment } from '../lib/upload-file'

export function AttachmentCard({
  file,
  canRemove,
  onRemove
}: {
  file: FileAttachment
  canRemove?: boolean
  onRemove?: () => void
}) {
  const image = isImageType(file.contentType)
  const src = file.previewUrl ?? (file.id ? contentSrc(file.id) : null)

  return (
    <figure className="relative overflow-hidden rounded-xl border border-border bg-muted/40">
      {image && src ? (
        <ImageLightbox src={src} alt={file.originalName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-64 w-full object-cover"
          />
        </ImageLightbox>
      ) : isAudioType(file.contentType) && src ? (
        <div className="px-3 pt-3">
          <audio
            controls
            preload="metadata"
            src={src}
            className="w-full"
            aria-label={file.originalName}
          >
            Your browser cannot play this audio.
          </audio>
        </div>
      ) : isVideoType(file.contentType) && src ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={src}
          className="max-h-64 w-full bg-black"
          aria-label={file.originalName}
        >
          Your browser cannot play this video.
        </video>
      ) : file.contentType === 'application/pdf' && src && !file.previewUrl ? (
        <iframe
          title={file.originalName}
          src={src}
          sandbox=""
          className="h-64 w-full bg-white"
        />
      ) : (
        <div className="flex items-center gap-3 p-3">
          <FileText className="size-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {file.contentType} · {formatBytes(file.byteSize)}
            </p>
          </div>
        </div>
      )}
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="truncate">{file.originalName}</span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => void downloadAttachment(file.id)}
            aria-label={`Download ${file.originalName}`}
          >
            <Download className="size-3.5" />
          </button>
          {canRemove ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-red-600"
              onClick={onRemove}
              aria-label={`Remove ${file.originalName}`}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </span>
      </figcaption>
    </figure>
  )
}

export function AttachmentGrid({
  files,
  canRemove,
  onRemove
}: {
  files: FileAttachment[]
  canRemove?: boolean
  onRemove?: (id: string) => void
}) {
  if (files.length === 0) {
    return null
  }
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {files.map((file) => (
        <AttachmentCard
          key={file.id}
          file={file}
          canRemove={canRemove}
          onRemove={onRemove ? () => onRemove(file.id) : undefined}
        />
      ))}
    </div>
  )
}
