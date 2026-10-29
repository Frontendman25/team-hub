import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export function localObjectRoot(): string {
  return resolve(
    process.env.STORAGE_LOCAL_DIR ?? resolve(process.cwd(), '.local-storage')
  )
}

export function localObjectPath(objectKey: string): string {
  if (
    objectKey.includes('..') ||
    objectKey.includes('\\') ||
    objectKey.startsWith('/') ||
    objectKey.includes('\0')
  ) {
    throw new Error('Invalid object key')
  }
  return resolve(localObjectRoot(), objectKey)
}

export function usesLocalObjectDisk(): boolean {
  return process.env.NODE_ENV !== 'test'
}

export async function writeLocalObject(
  objectKey: string,
  bytes: Buffer
): Promise<void> {
  const path = localObjectPath(objectKey)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, bytes)
}

export async function readLocalObject(
  objectKey: string
): Promise<Buffer | null> {
  try {
    return await readFile(localObjectPath(objectKey))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function deleteLocalObject(objectKey: string): Promise<void> {
  try {
    await unlink(localObjectPath(objectKey))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw error
  }
}
