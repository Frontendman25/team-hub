import { describe, expect, it, vi } from 'vitest'
import { SendMessageUseCase } from '../../src/modules/messaging/application/send-message.use-case'
import type { ConversationAccess } from '../../src/modules/messaging/application/conversation-access'
import type { MessagingRepository } from '../../src/modules/messaging/domain/messaging.repository'
import type { MessageRateLimiter } from '../../src/modules/messaging/infrastructure/message-rate-limiter'
import type { HydrateAttachments } from '../../src/modules/files/application/hydrate-attachments'
import { TooManyRequestsError } from '../../src/shared/domain/errors'

const conversationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const actorId = '11111111-1111-4111-8111-111111111111'

describe('SendMessageUseCase', () => {
  it('persists after membership check and returns duplicate flag', async () => {
    const messaging = {
      insertMessage: vi.fn().mockResolvedValue({
        duplicate: true,
        message: { id: 'm1', clientId: 'c1' }
      }),
      listMemberIds: vi.fn().mockResolvedValue([actorId])
    } as unknown as MessagingRepository
    const access = {
      requireReadable: vi.fn().mockResolvedValue({
        id: conversationId,
        type: 'channel',
        workspaceId: '88888888-8888-4888-8888-888888888888'
      })
    } as unknown as ConversationAccess
    const rateLimiter = {
      allow: vi.fn().mockResolvedValue(true)
    } as unknown as MessageRateLimiter

    const attachments = {
      message: vi.fn(async (message: unknown) => message)
    } as unknown as HydrateAttachments
    const useCase = new SendMessageUseCase(
      messaging,
      access,
      rateLimiter,
      attachments,
      {} as never,
      { assertFor: vi.fn().mockResolvedValue(undefined) } as never
    )
    const result = await useCase.execute({
      conversationId,
      actorId,
      content: 'Hello',
      clientId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    })

    expect(access.requireReadable).toHaveBeenCalledWith(conversationId, actorId)
    expect(result.duplicate).toBe(true)
  })

  it('rejects when the rate limiter is exhausted', async () => {
    const useCase = new SendMessageUseCase(
      {} as MessagingRepository,
      {} as ConversationAccess,
      {
        allow: vi.fn().mockResolvedValue(false)
      } as unknown as MessageRateLimiter,
      {} as HydrateAttachments
    )

    await expect(
      useCase.execute({
        conversationId,
        actorId,
        content: 'Hello',
        clientId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      })
    ).rejects.toBeInstanceOf(TooManyRequestsError)
  })
})
