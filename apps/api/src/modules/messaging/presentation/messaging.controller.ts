import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { CreateChannelUseCase } from '../application/create-channel.use-case'
import { DeleteMessageUseCase } from '../application/delete-message.use-case'
import { EditMessageUseCase } from '../application/edit-message.use-case'
import { ListConversationsUseCase } from '../application/list-conversations.use-case'
import { ListMessagesUseCase } from '../application/list-messages.use-case'
import { ListPresenceUseCase } from '../application/list-presence.use-case'
import { MarkConversationReadUseCase } from '../application/mark-conversation-read.use-case'
import { OpenDirectMessageUseCase } from '../application/open-direct-message.use-case'
import { SearchMessagesUseCase } from '../application/search-messages.use-case'
import { SendMessageUseCase } from '../application/send-message.use-case'
import {
  serializeConversation,
  serializeMessage
} from '../application/serialize'
import { UpdateChannelUseCase } from '../application/update-channel.use-case'
import { MessagingGateway } from './messaging.gateway'
import {
  createChannelSchema,
  editMessageSchema,
  listMessagesQuerySchema,
  openDmSchema,
  searchQuerySchema,
  sendMessageSchema,
  updateChannelSchema,
  type CreateChannelBody,
  type EditMessageBody,
  type ListMessagesQuery,
  type OpenDmBody,
  type SearchQuery,
  type SendMessageBody,
  type UpdateChannelBody
} from './messaging.schemas'

@Controller()
@UseGuards(SessionAuthGuard)
export class MessagingController {
  constructor(
    private readonly listConversations: ListConversationsUseCase,
    private readonly createChannel: CreateChannelUseCase,
    private readonly updateChannel: UpdateChannelUseCase,
    private readonly openDirectMessage: OpenDirectMessageUseCase,
    private readonly listMessages: ListMessagesUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly editMessage: EditMessageUseCase,
    private readonly deleteMessage: DeleteMessageUseCase,
    private readonly markRead: MarkConversationReadUseCase,
    private readonly searchMessages: SearchMessagesUseCase,
    private readonly listPresence: ListPresenceUseCase,
    private readonly gateway: MessagingGateway
  ) {}

  @Get('workspaces/:workspaceId/conversations')
  async conversations(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string
  ) {
    const data = await this.listConversations.execute(workspaceId, actorId)
    return { data: data.map(serializeConversation) }
  }

  @Post('workspaces/:workspaceId/channels')
  @HttpCode(HttpStatus.CREATED)
  async channel(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Body(new ZodValidationPipe(createChannelSchema)) body: CreateChannelBody
  ) {
    const created = await this.createChannel.execute({
      workspaceId,
      actorId,
      name: body.name,
      topic: body.topic
    })
    return serializeConversation(created)
  }

  @Post('workspaces/:workspaceId/dms')
  async dm(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Body(new ZodValidationPipe(openDmSchema)) body: OpenDmBody
  ) {
    const conversation = await this.openDirectMessage.execute({
      workspaceId,
      actorId,
      userId: body.userId
    })
    return serializeConversation(conversation)
  }

  @Get('workspaces/:workspaceId/presence')
  presence(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string
  ) {
    return this.listPresence.execute(workspaceId, actorId)
  }

  @Get('workspaces/:workspaceId/messages/search')
  async search(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery
  ) {
    const data = await this.searchMessages.execute({
      workspaceId,
      actorId,
      query: query.q,
      limit: query.limit
    })
    return { data: data.map(serializeMessage) }
  }

  @Patch('conversations/:id')
  async update(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateChannelSchema)) body: UpdateChannelBody
  ) {
    const updated = await this.updateChannel.execute({
      conversationId: id,
      actorId,
      name: body.name,
      topic: body.topic
    })
    return serializeConversation(updated)
  }

  @Get('conversations/:id/messages')
  async messages(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query(new ZodValidationPipe(listMessagesQuerySchema))
    query: ListMessagesQuery
  ) {
    const result = await this.listMessages.execute({
      conversationId: id,
      actorId,
      cursor: query.cursor,
      limit: query.limit
    })
    return {
      data: result.items.map(serializeMessage),
      nextCursor: result.nextCursor
    }
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageBody
  ) {
    const result = await this.sendMessage.execute({
      conversationId: id,
      actorId,
      content: body.content,
      clientId: body.clientId,
      attachmentIds: body.attachmentIds
    })
    const payload = serializeMessage(result.message)
    this.gateway.publishCreated(
      result.conversation.workspaceId,
      result.conversation.type,
      id,
      result.memberIds,
      payload
    )
    return payload
  }

  @Post('conversations/:id/read')
  async read(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    const summary = await this.markRead.execute(id, actorId)
    return summary ? serializeConversation(summary) : { id, unreadCount: 0 }
  }

  @Patch('messages/:id')
  async edit(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(editMessageSchema)) body: EditMessageBody
  ) {
    const result = await this.editMessage.execute({
      messageId: id,
      actorId,
      content: body.content
    })
    const payload = serializeMessage(result.message)
    if (result.changed) {
      this.gateway.publishUpdated(
        result.conversation.workspaceId,
        result.conversation.type,
        result.message.conversationId,
        result.memberIds,
        payload
      )
    }
    return payload
  }

  @Delete('messages/:id')
  async remove(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    const result = await this.deleteMessage.execute(id, actorId)
    const payload = serializeMessage(result.message)
    this.gateway.publishDeleted(
      result.conversation.workspaceId,
      result.conversation.type,
      result.message.conversationId,
      result.memberIds,
      payload
    )
    return payload
  }
}
