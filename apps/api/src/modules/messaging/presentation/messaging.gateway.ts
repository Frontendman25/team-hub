import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { AppError } from '../../../shared/domain/errors'
import { ConversationAccess } from '../application/conversation-access'
import { DeleteMessageUseCase } from '../application/delete-message.use-case'
import { EditMessageUseCase } from '../application/edit-message.use-case'
import { MarkConversationReadUseCase } from '../application/mark-conversation-read.use-case'
import {
  serializeConversation,
  serializeMessage
} from '../application/serialize'
import { SendMessageUseCase } from '../application/send-message.use-case'
import { PresenceService } from '../infrastructure/presence.service'
import { SocketSessionService } from '../infrastructure/socket-session.service'
import {
  joinConversationSchema,
  joinWorkspaceSchema,
  socketEditSchema,
  socketMessageIdSchema,
  socketSendSchema,
  socketTypingSchema
} from './messaging.schemas'

type AuthedSocket = Socket & {
  data: {
    userId?: string
    workspaceId?: string
  }
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: { credentials: true }
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagingGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(
    private readonly sessions: SocketSessionService,
    private readonly access: ConversationAccess,
    private readonly sendMessage: SendMessageUseCase,
    private readonly editMessage: EditMessageUseCase,
    private readonly deleteMessage: DeleteMessageUseCase,
    private readonly markRead: MarkConversationReadUseCase,
    private readonly presence: PresenceService
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const userId = await this.sessions.resolveUserId(
      client.handshake.headers.cookie
    )
    if (!userId) {
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
      client.disconnect(true)
      return
    }
    client.data.userId = userId
    await client.join(`user:${userId}`)
    client.emit('session.ready', { userId })
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    const { userId, workspaceId } = client.data
    if (userId && workspaceId) {
      await this.presence.disconnect(userId, workspaceId)
      await this.emitPresence(workspaceId)
    }
  }

  @SubscribeMessage('join.workspace')
  async joinWorkspace(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    const userId = this.requireUser(client)
    const parsed = joinWorkspaceSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload')
    }
    try {
      await this.access.requireMember(parsed.data.workspaceId, userId)
    } catch (error) {
      return this.failFrom(client, error)
    }
    if (client.data.workspaceId) {
      await client.leave(`workspace:${client.data.workspaceId}`)
    }
    client.data.workspaceId = parsed.data.workspaceId
    await client.join(`workspace:${parsed.data.workspaceId}`)
    await this.presence.heartbeat(userId, parsed.data.workspaceId)
    await this.emitPresence(parsed.data.workspaceId)
    return { ok: true }
  }

  @SubscribeMessage('presence.ping')
  async ping(@ConnectedSocket() client: AuthedSocket) {
    const userId = this.requireUser(client)
    const workspaceId = client.data.workspaceId
    if (!workspaceId) {
      return { ok: false }
    }
    await this.presence.heartbeat(userId, workspaceId)
    return { ok: true }
  }

  @SubscribeMessage('join.conversation')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    const userId = this.requireUser(client)
    const parsed = joinConversationSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload')
    }
    try {
      await this.access.requireReadable(parsed.data.conversationId, userId)
    } catch (error) {
      return this.failFrom(client, error)
    }
    await client.join(`conversation:${parsed.data.conversationId}`)
    return { ok: true }
  }

  @SubscribeMessage('leave.conversation')
  async leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    this.requireUser(client)
    const parsed = joinConversationSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload')
    }
    await client.leave(`conversation:${parsed.data.conversationId}`)
    return { ok: true }
  }

  @SubscribeMessage('message.send')
  async onSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    const userId = this.requireUser(client)
    const parsed = socketSendSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload', {
        clientId:
          typeof body === 'object' &&
          body !== null &&
          'clientId' in body &&
          typeof body.clientId === 'string'
            ? body.clientId
            : undefined,
        conversationId:
          typeof body === 'object' &&
          body !== null &&
          'conversationId' in body &&
          typeof body.conversationId === 'string'
            ? body.conversationId
            : undefined
      })
    }
    try {
      const result = await this.sendMessage.execute({
        conversationId: parsed.data.conversationId,
        actorId: userId,
        content: parsed.data.content,
        clientId: parsed.data.clientId,
        attachmentIds: parsed.data.attachmentIds
      })
      const payload = serializeMessage(result.message)
      this.publishCreated(
        result.conversation.workspaceId,
        result.conversation.type,
        parsed.data.conversationId,
        result.memberIds,
        payload
      )
      return payload
    } catch (error) {
      return this.failFrom(
        client,
        error,
        parsed.data.clientId,
        parsed.data.conversationId
      )
    }
  }

  @SubscribeMessage('message.edit')
  async onEdit(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    const userId = this.requireUser(client)
    const parsed = socketEditSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload')
    }
    try {
      const result = await this.editMessage.execute({
        messageId: parsed.data.messageId,
        actorId: userId,
        content: parsed.data.content
      })
      const payload = serializeMessage(result.message)
      if (result.changed) {
        this.publishUpdated(
          result.conversation.workspaceId,
          result.conversation.type,
          result.message.conversationId,
          result.memberIds,
          payload
        )
      }
      return payload
    } catch (error) {
      return this.failFrom(client, error)
    }
  }

  @SubscribeMessage('message.delete')
  async onDelete(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    const userId = this.requireUser(client)
    const parsed = socketMessageIdSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload')
    }
    try {
      const result = await this.deleteMessage.execute(
        parsed.data.messageId,
        userId
      )
      const payload = serializeMessage(result.message)
      this.publishDeleted(
        result.conversation.workspaceId,
        result.conversation.type,
        result.message.conversationId,
        result.memberIds,
        payload
      )
      return payload
    } catch (error) {
      return this.failFrom(client, error)
    }
  }

  @SubscribeMessage('conversation.read')
  async onRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    const userId = this.requireUser(client)
    const parsed = joinConversationSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload')
    }
    try {
      const summary = await this.markRead.execute(
        parsed.data.conversationId,
        userId
      )
      return summary ? serializeConversation(summary) : { ok: true }
    } catch (error) {
      return this.failFrom(client, error)
    }
  }

  @SubscribeMessage('typing.start')
  async onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown
  ) {
    const userId = this.requireUser(client)
    const parsed = socketTypingSchema.safeParse(body)
    if (!parsed.success) {
      return this.fail(client, 'VALIDATION_ERROR', 'Invalid payload')
    }
    try {
      await this.access.requireReadable(parsed.data.conversationId, userId)
    } catch (error) {
      return this.failFrom(client, error)
    }
    client.to(`conversation:${parsed.data.conversationId}`).emit('typing', {
      conversationId: parsed.data.conversationId,
      userId
    })
    return { ok: true }
  }

  publishCreated(
    workspaceId: string,
    type: string,
    conversationId: string,
    memberIds: string[],
    payload: ReturnType<typeof serializeMessage>
  ): void {
    this.fanout(
      'message.created',
      workspaceId,
      type,
      conversationId,
      memberIds,
      payload
    )
  }

  publishUpdated(
    workspaceId: string,
    type: string,
    conversationId: string,
    memberIds: string[],
    payload: ReturnType<typeof serializeMessage>
  ): void {
    this.fanout(
      'message.updated',
      workspaceId,
      type,
      conversationId,
      memberIds,
      payload
    )
  }

  publishDeleted(
    workspaceId: string,
    type: string,
    conversationId: string,
    memberIds: string[],
    payload: ReturnType<typeof serializeMessage>
  ): void {
    this.fanout(
      'message.deleted',
      workspaceId,
      type,
      conversationId,
      memberIds,
      payload
    )
  }

  broadcastWorkspace(
    workspaceId: string,
    event: string,
    payload: unknown
  ): void {
    this.server?.to(`workspace:${workspaceId}`).emit(event, payload)
  }

  private fanout(
    event: 'message.created' | 'message.updated' | 'message.deleted',
    workspaceId: string,
    type: string,
    conversationId: string,
    memberIds: string[],
    payload: ReturnType<typeof serializeMessage>
  ): void {
    this.server.to(`conversation:${conversationId}`).emit(event, payload)
    if (type === 'channel') {
      this.server.to(`workspace:${workspaceId}`).emit(event, payload)
      return
    }
    for (const memberId of memberIds) {
      this.server.to(`user:${memberId}`).emit(event, payload)
    }
  }

  private async emitPresence(workspaceId: string): Promise<void> {
    const userIds = await this.presence.listOnline(workspaceId)
    this.server.to(`workspace:${workspaceId}`).emit('presence.update', {
      workspaceId,
      userIds
    })
  }

  private requireUser(client: AuthedSocket): string {
    if (!client.data.userId) {
      client.disconnect(true)
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
    }
    return client.data.userId
  }

  private fail(
    client: AuthedSocket,
    code: string,
    message: string,
    extra: { clientId?: string; conversationId?: string } = {}
  ) {
    const payload = { code, message, ...extra }
    client.emit('error', payload)
    return payload
  }

  private failFrom(
    client: AuthedSocket,
    error: unknown,
    clientId?: string,
    conversationId?: string
  ) {
    if (error instanceof AppError) {
      return this.fail(client, error.code, error.message, {
        clientId,
        conversationId
      })
    }
    this.logger.error(error)
    return this.fail(client, 'INTERNAL_ERROR', 'Internal server error', {
      clientId,
      conversationId
    })
  }
}
