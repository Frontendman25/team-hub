export type PostAuthor = {
  id: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
}

export type PostRecord = {
  id: string
  workspaceId: string
  authorId: string
  content: string
  imageUrl: string | null
  imageAlt: string | null
  createdAt: Date
  updatedAt: Date
  commentsCount: number
  reactionsCount: number
  viewerHasReacted: boolean
  author: PostAuthor
  attachments?: import('../../files/domain/file.record').FilePublic[]
}

export type CreatePostData = {
  workspaceId: string
  authorId: string
  content: string
  imageUrl?: string | null
  imageAlt?: string | null
  attachmentIds?: string[]
}

export type UpdatePostData = {
  content?: string
  imageUrl?: string | null
  imageAlt?: string | null
}

export type ListPostsQuery = {
  workspaceId: string
  limit: number
  offset: number
  authorId?: string
  viewerId?: string
}

export type ListPostsResult = {
  items: PostRecord[]
  total: number
}

export interface PostRepository {
  create(data: CreatePostData): Promise<PostRecord>
  findById(id: string, viewerId?: string): Promise<PostRecord | null>
  list(query: ListPostsQuery): Promise<ListPostsResult>
  update(id: string, data: UpdatePostData): Promise<PostRecord | null>
  delete(id: string): Promise<boolean>
}
