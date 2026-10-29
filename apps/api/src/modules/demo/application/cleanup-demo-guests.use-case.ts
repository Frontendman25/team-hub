import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq, lt } from 'drizzle-orm'
import { DrizzleService } from '../../../infrastructure/database/drizzle.service'
import { comments } from '../../../infrastructure/database/schema/comments'
import { files } from '../../../infrastructure/database/schema/files'
import { messages } from '../../../infrastructure/database/schema/messaging'
import { notifications } from '../../../infrastructure/database/schema/notifications'
import { posts } from '../../../infrastructure/database/schema/posts'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import { reactions } from '../../../infrastructure/database/schema/reactions'
import { sessions } from '../../../infrastructure/database/schema/sessions'
import { tasks } from '../../../infrastructure/database/schema/tasks'
import { users } from '../../../infrastructure/database/schema/users'
import { workspaceMembers } from '../../../infrastructure/database/schema/workspaces'
import { OBJECT_STORAGE } from '../../files/files.tokens'
import type { ObjectStorage } from '../../files/domain/object-storage'

@Injectable()
export class CleanupDemoGuestsUseCase {
  private readonly logger = new Logger(CleanupDemoGuestsUseCase.name)

  constructor(
    private readonly drizzle: DrizzleService,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage
  ) {}

  async execute(): Promise<{ removed: number }> {
    const expired = await this.drizzle.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.accountKind, 'guest'),
          lt(users.guestExpiresAt, new Date())
        )
      )

    let removed = 0
    for (const guest of expired) {
      await this.removeGuest(guest.id)
      removed += 1
    }
    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired demo guests`)
    }
    return { removed }
  }

  async removeGuest(guestId: string): Promise<void> {
    const uploaded = await this.drizzle.db
      .select({ id: files.id, objectKey: files.objectKey })
      .from(files)
      .where(eq(files.uploadedBy, guestId))

    for (const file of uploaded) {
      await this.storage.delete(file.objectKey).catch(() => undefined)
    }

    await this.drizzle.db.transaction(async (tx) => {
      await tx.delete(files).where(eq(files.uploadedBy, guestId))
      await tx
        .update(tasks)
        .set({ assigneeId: null })
        .where(eq(tasks.assigneeId, guestId))
      await tx.delete(tasks).where(eq(tasks.createdBy, guestId))
      await tx.delete(messages).where(eq(messages.authorId, guestId))
      await tx.delete(reactions).where(eq(reactions.userId, guestId))
      await tx.delete(comments).where(eq(comments.authorId, guestId))
      await tx
        .delete(notifications)
        .where(eq(notifications.recipientId, guestId))
      await tx.delete(notifications).where(eq(notifications.actorId, guestId))
      await tx.delete(posts).where(eq(posts.authorId, guestId))
      await tx.delete(sessions).where(eq(sessions.userId, guestId))
      await tx
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.userId, guestId))
      await tx.delete(profiles).where(eq(profiles.userId, guestId))
      await tx.delete(users).where(eq(users.id, guestId))
    })
  }
}
