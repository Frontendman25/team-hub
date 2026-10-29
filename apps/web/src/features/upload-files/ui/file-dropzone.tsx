'use client'

import { Paperclip } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { MAX_ATTACHMENTS, validateLocalFile } from '../lib/file-rules'

export function FileDropzone({
  disabled,
  remaining,
  onFiles
}: {
  disabled?: boolean
  remaining: number
  onFiles: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function accept(list: FileList | File[]) {
    const incoming = Array.from(list).slice(0, Math.max(remaining, 0))
    const valid: File[] = []
    for (const file of incoming) {
      const message = validateLocalFile(file)
      if (message) {
        setError(message)
        return
      }
      valid.push(file)
    }
    setError(null)
    if (valid.length > 0) {
      onFiles(valid)
    }
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm',
          dragging ? 'border-accent bg-accent/40' : 'border-border bg-muted/40'
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          accept(event.dataTransfer.files)
        }}
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          disabled={disabled || remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="size-4" />
          Attach files
        </button>
        <span className="text-xs text-muted-foreground">
          Up to {MAX_ATTACHMENTS} · 10 MB files · 25 MB audio/video
        </span>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.docx,.xlsx,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,video/webm,video/mp4,video/ogg,.webm,.mp4,.m4a,.mp3,.wav,.ogg"
          onChange={(event) => {
            if (event.target.files) {
              accept(event.target.files)
              event.target.value = ''
            }
          }}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
