import { describe, expect, it, vi } from 'vitest'
import { EditMessageUseCase } from '../../src/modules/messaging/application/edit-message.use-case'
import type { ConversationAccess } from '../../src/modules/messaging/application/conversation-access'
import type { HydrateAttachments } from '../../src/modules/files/application/hydrate-attachments'
import type { MessagingRepository } from '../../src/modules/messaging/domain/messaging.repository'

const messageId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const actorId = '11111111-1111-4111-8111-111111111111'
const conversationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const message = {
  id: messageId,
  conversationId,
  authorId: actorId,
  content: 'Please edit me',
  deletedAt: null
}

const conversation = {
  id: conversationId,
  type: 'channel',
  workspaceId: '88888888-8888-4888-8888-888888888888'
}

describe('EditMessageUseCase', () => {
  it('does not persist when the content is unchanged', async () => {
    const messaging = {
      findMessage: vi.fn().mockResolvedValue(message),
      updateMessageContent: vi.fn(),
      listMemberIds: vi.fn()
    } as unknown as MessagingRepository
    const access = {
      requireReadable: vi.fn().mockResolvedValue(conversation)
    } as unknown as ConversationAccess

    const attachments = {
      message: vi.fn(async (item: typeof message) => ({
        ...item,
        attachments: []
      }))
    } as unknown as HydrateAttachments

    const result = await new EditMessageUseCase(
      messaging,
      access,
      attachments
    ).execute({
      messageId,
      actorId,
      content: 'Please edit me'
    })

    expect(result.changed).toBe(false)
    expect(result.message.content).toBe(message.content)
    expect(messaging.updateMessageContent).not.toHaveBeenCalled()
  })

  it('persists a real edit', async () => {
    const updated = { ...message, content: 'Changed', editedAt: new Date() }
    const messaging = {
      findMessage: vi.fn().mockResolvedValue(message),
      updateMessageContent: vi.fn().mockResolvedValue(updated),
      listMemberIds: vi.fn()
    } as unknown as MessagingRepository
    const access = {
      requireReadable: vi.fn().mockResolvedValue(conversation)
    } as unknown as ConversationAccess

    const attachments = {
      message: vi.fn(async (item: typeof updated) => ({
        ...item,
        attachments: [{ id: 'file-1' }]
      }))
    } as unknown as HydrateAttachments

    const result = await new EditMessageUseCase(
      messaging,
      access,
      attachments
    ).execute({
      messageId,
      actorId,
      content: 'Changed'
    })

    expect(result.changed).toBe(true)
    expect(result.message.attachments).toEqual([{ id: 'file-1' }])
    expect(messaging.updateMessageContent).toHaveBeenCalledWith(
      messageId,
      'Changed'
    )
  })
})
