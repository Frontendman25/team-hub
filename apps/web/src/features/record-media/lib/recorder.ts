export const AUDIO_MAX_SECONDS = 120
export const VIDEO_MAX_SECONDS = 30
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024

export type RecorderKind = 'audio' | 'video'

export type RecorderMime = {
  mimeType: string
  contentType: string
  extension: string
}

const AUDIO_CANDIDATES: RecorderMime[] = [
  {
    mimeType: 'audio/webm;codecs=opus',
    contentType: 'audio/webm',
    extension: 'webm'
  },
  { mimeType: 'audio/webm', contentType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/mp4', contentType: 'audio/mp4', extension: 'm4a' },
  {
    mimeType: 'audio/ogg;codecs=opus',
    contentType: 'audio/ogg',
    extension: 'ogg'
  }
]

const VIDEO_CANDIDATES: RecorderMime[] = [
  {
    mimeType: 'video/webm;codecs=vp9,opus',
    contentType: 'video/webm',
    extension: 'webm'
  },
  {
    mimeType: 'video/webm;codecs=vp8,opus',
    contentType: 'video/webm',
    extension: 'webm'
  },
  { mimeType: 'video/webm', contentType: 'video/webm', extension: 'webm' },
  { mimeType: 'video/mp4', contentType: 'video/mp4', extension: 'mp4' }
]

export function pickRecorderMime(
  kind: RecorderKind,
  isSupported: (mimeType: string) => boolean
): RecorderMime | null {
  const list = kind === 'audio' ? AUDIO_CANDIDATES : VIDEO_CANDIDATES
  return list.find((candidate) => isSupported(candidate.mimeType)) ?? null
}

export function maxSecondsFor(kind: RecorderKind): number {
  return kind === 'audio' ? AUDIO_MAX_SECONDS : VIDEO_MAX_SECONDS
}

export function formatClock(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function permissionErrorMessage(error: unknown): {
  status: 'denied' | 'failed' | 'unsupported'
  message: string
} {
  const name =
    error instanceof DOMException
      ? error.name
      : error instanceof Error
        ? error.name
        : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      status: 'denied',
      message:
        'Microphone or camera access was blocked. Allow it in the browser and try again.'
    }
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      status: 'failed',
      message: 'No microphone or camera was found on this device.'
    }
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      status: 'failed',
      message: 'The microphone or camera is already in use by another app.'
    }
  }
  if (name === 'NotSupportedError') {
    return {
      status: 'unsupported',
      message: 'This browser cannot record audio or video messages.'
    }
  }
  return {
    status: 'failed',
    message: 'Could not start recording. Check permissions and try again.'
  }
}

export function recordingConstraints(kind: RecorderKind): MediaStreamConstraints {
  if (kind === 'audio') {
    return { audio: true, video: false }
  }
  return {
    audio: true,
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
  }
}

export function blobToRecordingFile(
  blob: Blob,
  kind: RecorderKind,
  mime: RecorderMime
): File {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `${kind === 'audio' ? 'voice' : 'video'}-${stamp}.${mime.extension}`
  return new File([blob], name, { type: mime.contentType })
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop()
  })
}
