'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  blobToRecordingFile,
  formatClock,
  maxSecondsFor,
  pickRecorderMime,
  permissionErrorMessage,
  recordingConstraints,
  stopStream,
  type RecorderKind,
  type RecorderMime
} from '../lib/recorder'

export type RecorderView =
  | { status: 'idle' }
  | { status: 'requesting'; kind: RecorderKind }
  | { status: 'recording'; kind: RecorderKind; elapsedMs: number }
  | {
      status: 'preview'
      kind: RecorderKind
      url: string
      file: File
      elapsedMs: number
    }
  | {
      status: 'uploading'
      kind: RecorderKind
      url: string
      file: File
      elapsedMs: number
    }
  | { status: 'denied' | 'unsupported' | 'failed'; message: string }

export function useMediaRecorder() {
  const [view, setView] = useState<RecorderView>({ status: 'idle' })
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeRef = useRef<RecorderMime | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)
  const tickRef = useRef<number | null>(null)
  const limitRef = useRef<number | null>(null)
  const discardRef = useRef(false)
  const generationRef = useRef(0)
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)

  const clearPreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (limitRef.current != null) {
      window.clearTimeout(limitRef.current)
      limitRef.current = null
    }
  }, [])

  const releaseHardware = useCallback(() => {
    clearTimers()
    stopStream(streamRef.current)
    streamRef.current = null
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null
    }
  }, [clearTimers])

  const reset = useCallback(() => {
    discardRef.current = true
    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    releaseHardware()
    clearPreviewUrl()
    chunksRef.current = []
    mimeRef.current = null
    setView({ status: 'idle' })
  }, [clearPreviewUrl, releaseHardware])

  const bindLiveVideo = useCallback((node: HTMLVideoElement | null) => {
    liveVideoRef.current = node
    const stream = streamRef.current
    if (!node || !stream) {
      return
    }
    node.srcObject = stream
    void node.play().catch(() => undefined)
  }, [])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      discardRef.current = true
      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
      }
      releaseHardware()
      clearPreviewUrl()
    }
  }, [clearPreviewUrl, releaseHardware])

  const finishRecording = useCallback(
    (kind: RecorderKind) => {
      const mime = mimeRef.current
      const blob = new Blob(chunksRef.current, {
        type: mime?.contentType ?? 'application/octet-stream'
      })
      releaseHardware()
      if (!mime || blob.size < 1) {
        setView({
          status: 'failed',
          message: 'The recording was empty. Try again.'
        })
        return
      }
      clearPreviewUrl()
      const file = blobToRecordingFile(blob, kind, mime)
      const url = URL.createObjectURL(file)
      previewUrlRef.current = url
      setView({
        status: 'preview',
        kind,
        url,
        file,
        elapsedMs: Date.now() - startedAtRef.current
      })
    },
    [clearPreviewUrl, releaseHardware]
  )

  const start = useCallback(
    async (kind: RecorderKind) => {
      generationRef.current += 1
      const generation = generationRef.current
      reset()
      discardRef.current = false
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      ) {
        setView({
          status: 'unsupported',
          message: 'This browser cannot record audio or video messages.'
        })
        return
      }
      const mime = pickRecorderMime(kind, (type) =>
        MediaRecorder.isTypeSupported(type)
      )
      if (!mime) {
        setView({
          status: 'unsupported',
          message: 'No supported recording format is available in this browser.'
        })
        return
      }
      mimeRef.current = mime
      setView({ status: 'requesting', kind })
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          recordingConstraints(kind)
        )
        if (discardRef.current || generation !== generationRef.current) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        if (kind === 'video') {
          bindLiveVideo(liveVideoRef.current)
        }
        chunksRef.current = []
        const recorder = new MediaRecorder(stream, { mimeType: mime.mimeType })
        recorderRef.current = recorder
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
          }
        }
        recorder.onerror = () => {
          setView({
            status: 'failed',
            message: 'Recording failed. Please try again.'
          })
          releaseHardware()
        }
        recorder.onstop = () => {
          recorderRef.current = null
          if (discardRef.current || generation !== generationRef.current) {
            releaseHardware()
            return
          }
          finishRecording(kind)
        }
        startedAtRef.current = Date.now()
        recorder.start(250)
        setView({ status: 'recording', kind, elapsedMs: 0 })
        tickRef.current = window.setInterval(() => {
          setView((current) =>
            current.status === 'recording'
              ? { ...current, elapsedMs: Date.now() - startedAtRef.current }
              : current
          )
        }, 200)
        limitRef.current = window.setTimeout(() => {
          if (recorderRef.current?.state === 'recording') {
            recorderRef.current.stop()
          }
        }, maxSecondsFor(kind) * 1000)
      } catch (error) {
        releaseHardware()
        const mapped = permissionErrorMessage(error)
        setView({ status: mapped.status, message: mapped.message })
      }
    },
    [bindLiveVideo, finishRecording, releaseHardware, reset]
  )

  const stop = useCallback(() => {
    discardRef.current = false
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const markUploading = useCallback(() => {
    setView((current) =>
      current.status === 'preview'
        ? {
            status: 'uploading',
            kind: current.kind,
            url: current.url,
            file: current.file,
            elapsedMs: current.elapsedMs
          }
        : current
    )
  }, [])

  const restorePreview = useCallback(() => {
    setView((current) =>
      current.status === 'uploading'
        ? {
            status: 'preview',
            kind: current.kind,
            url: current.url,
            file: current.file,
            elapsedMs: current.elapsedMs
          }
        : current
    )
  }, [])

  return {
    view,
    liveVideoRef: bindLiveVideo,
    start,
    stop,
    reset,
    markUploading,
    restorePreview,
    clock:
      view.status === 'recording' ||
      view.status === 'preview' ||
      view.status === 'uploading'
        ? formatClock(view.elapsedMs)
        : '0:00',
    previewFile:
      view.status === 'preview' || view.status === 'uploading'
        ? view.file
        : null
  }
}
