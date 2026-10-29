import { api } from '@/shared/api/client'
import type { FileAttachment } from '@/shared/types/api'

export type UploadProgress = {
  loaded: number
  total: number
}

export function contentSrc(fileId: string): string {
  return `/api/files/${fileId}/content`
}

export async function uploadWorkspaceFile(
  workspaceId: string,
  file: File,
  options: {
    onProgress?: (progress: UploadProgress) => void
    signal?: AbortSignal
  } = {}
): Promise<FileAttachment> {
  const initiated = await api.files.initiate(workspaceId, {
    originalName: file.name,
    contentType: (file.type || 'application/octet-stream').split(';')[0].trim(),
    byteSize: file.size
  })

  const target = initiated.uploadUrl.startsWith('memory://')
    ? `/api/files/${initiated.file.id}/content`
    : initiated.uploadUrl
  await putObject(target, file, initiated.uploadHeaders, options)

  return api.files.complete(initiated.file.id)
}

function putObject(
  url: string,
  file: File,
  headers: Record<string, string>,
  options: {
    onProgress?: (progress: UploadProgress) => void
    signal?: AbortSignal
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        options.onProgress?.({ loaded: event.loaded, total: event.total })
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}

export async function downloadAttachment(fileId: string): Promise<void> {
  const result = await api.files.contentUrl(fileId)
  if (result.strategy === 'presigned') {
    window.open(result.url, '_blank', 'noopener,noreferrer')
    return
  }
  window.open(contentSrc(fileId), '_blank', 'noopener,noreferrer')
}
