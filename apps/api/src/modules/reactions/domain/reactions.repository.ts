export interface ReactionsRepository {
  add(postId: string, userId: string, type: string): Promise<boolean>
  remove(postId: string, userId: string): Promise<boolean>
}
