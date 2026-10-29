export type CommentAuthor = {
  id: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
}

export type CommentRecord = {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: CommentAuthor
}

export interface CommentsRepository {
  listByPost(postId: string): Promise<CommentRecord[]>
  create(data: {
    postId: string
    authorId: string
    content: string
  }): Promise<CommentRecord>
  findById(id: string): Promise<CommentRecord | null>
  delete(id: string): Promise<boolean>
}
