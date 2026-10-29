'use client'

import { useState } from 'react'
import { Mic, Square, Trash2, Video } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  AUDIO_MAX_SECONDS,
  MEDIA_MAX_BYTES,
  VIDEO_MAX_SECONDS,
  type RecorderKind
} from '../lib/recorder'
import { useMediaRecorder } from '../model/use-media-recorder'

export function MediaComposer({
  disabled,
  remaining,
  sending,
  allowVideo = true,
  onSend
}: {
  disabled?: boolean
  remaining: number
  sending?: boolean
  allowVideo?: boolean
  onSend: (file: File) => Promise<void>
}) {
  const recorder = useMediaRecorder()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const busy = disabled || remaining <= 0 || sending
  const active =
    recorder.view.status === 'requesting' ||
    recorder.view.status === 'recording' ||
    recorder.view.status === 'preview' ||
    recorder.view.status === 'uploading'

  async function sendPreview() {
    const file = recorder.previewFile
    if (!file) {
      return
    }
    if (file.size > MEDIA_MAX_BYTES) {
      recorder.reset()
      return
    }
    recorder.markUploading()
    setUploadError(null)
    try {
      await onSend(file)
      recorder.reset()
    } catch {
      recorder.restorePreview()
      setUploadError('Upload failed. Check your connection and try again.')
    }
  }

  return (
    <div className="space-y-2">
      {!active ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            disabled={busy}
            onClick={() => void recorder.start('audio')}
            aria-label="Record a voice message"
          >
            <Mic className="size-4" />
            Voice
          </button>
          {allowVideo ? (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            disabled={busy}
            onClick={() => void recorder.start('video')}
            aria-label="Record a video message"
          >
            <Video className="size-4" />
            Video
          </button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Voice up to {AUDIO_MAX_SECONDS / 60} min
            {allowVideo ? ` · video up to ${VIDEO_MAX_SECONDS}s` : ''}
          </span>
        </div>
      ) : null}

      {recorder.view.status === 'requesting' ? (
        <p className="text-sm text-muted-foreground">Waiting for permission…</p>
      ) : null}

      {recorder.view.status === 'recording' ? (
        <RecordingPanel
          kind={recorder.view.kind}
          clock={recorder.clock}
          liveVideoRef={recorder.liveVideoRef}
          onStop={recorder.stop}
          onCancel={recorder.reset}
        />
      ) : null}

      {recorder.view.status === 'preview' ||
      recorder.view.status === 'uploading' ? (
        <PreviewPanel
          kind={recorder.view.kind}
          url={recorder.view.url}
          clock={recorder.clock}
          uploading={recorder.view.status === 'uploading' || Boolean(sending)}
          onDiscard={() => {
            setUploadError(null)
            recorder.reset()
          }}
          onSend={() => void sendPreview()}
          error={uploadError}
        />
      ) : null}

      {recorder.view.status === 'denied' ||
      recorder.view.status === 'unsupported' ||
      recorder.view.status === 'failed' ? (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{recorder.view.message}</p>
          <Button
            type="button"
            variant="ghost"
            className="h-8"
            onClick={recorder.reset}
          >
            Dismiss
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function RecordingPanel({
  kind,
  clock,
  liveVideoRef,
  onStop,
  onCancel
}: {
  kind: RecorderKind
  clock: string
  liveVideoRef: (node: HTMLVideoElement | null) => void
  onStop: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-white p-3">
      {kind === 'video' ? (
        <video
          ref={liveVideoRef}
          muted
          autoPlay
          playsInline
          className="max-h-48 w-full -scale-x-100 rounded-lg bg-black object-cover"
        />
      ) : null}
      <div className="flex items-center gap-3">
        <span className="size-2.5 animate-pulse rounded-full bg-red-500" />
        <p className="text-sm font-medium">
          Recording {kind} · {clock}
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="button" className="h-9 gap-1.5" onClick={onStop}>
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
        </div>
      </div>
    </div>
  )
}

function PreviewPanel({
  kind,
  url,
  clock,
  uploading,
  onDiscard,
  onSend,
  error
}: {
  kind: RecorderKind
  url: string
  clock: string
  uploading: boolean
  onDiscard: () => void
  onSend: () => void
  error: string | null
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-white p-3">
      {kind === 'video' ? (
        <video
          src={url}
          controls
          playsInline
          className="max-h-48 w-full rounded-lg bg-black"
        />
      ) : (
        <audio src={url} controls className="w-full" />
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Preview · {clock}</p>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 gap-1.5"
            disabled={uploading}
            onClick={onDiscard}
          >
            <Trash2 className="size-3.5" />
            Discard
          </Button>
          <Button
            type="button"
            className="h-9"
            disabled={uploading}
            onClick={onSend}
          >
            {uploading ? 'Uploading…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
