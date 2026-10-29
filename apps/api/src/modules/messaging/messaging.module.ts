import { Module } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { AuthModule } from '../auth/auth.module'
import { FilesModule } from '../files/files.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { ConversationAccess } from './application/conversation-access'
import { CreateChannelUseCase } from './application/create-channel.use-case'
import { DeleteMessageUseCase } from './application/delete-message.use-case'
import { EditMessageUseCase } from './application/edit-message.use-case'
import { ListConversationsUseCase } from './application/list-conversations.use-case'
import { ListMessagesUseCase } from './application/list-messages.use-case'
import { ListPresenceUseCase } from './application/list-presence.use-case'
import { MarkConversationReadUseCase } from './application/mark-conversation-read.use-case'
import { OpenDirectMessageUseCase } from './application/open-direct-message.use-case'
import { SearchMessagesUseCase } from './application/search-messages.use-case'
import { SendMessageUseCase } from './application/send-message.use-case'
import { UpdateChannelUseCase } from './application/update-channel.use-case'
import type { MessagingRepository } from './domain/messaging.repository'
import { DrizzleMessagingRepository } from './infrastructure/drizzle-messaging.repository'
import { MessageRateLimiter } from './infrastructure/message-rate-limiter'
import { PresenceService } from './infrastructure/presence.service'
import { SocketSessionService } from './infrastructure/socket-session.service'
import { MESSAGING_REPOSITORY } from './messaging.tokens'
import { MessagingController } from './presentation/messaging.controller'
import { MessagingGateway } from './presentation/messaging.gateway'

@Module({
  imports: [WorkspacesModule, AuthModule, FilesModule],
  controllers: [MessagingController],
  providers: [
    {
      provide: MESSAGING_REPOSITORY,
      useFactory: (drizzle: DrizzleService): MessagingRepository =>
        new DrizzleMessagingRepository(drizzle.db),
      inject: [DrizzleService]
    },
    ConversationAccess,
    PresenceService,
    MessageRateLimiter,
    SocketSessionService,
    CreateChannelUseCase,
    UpdateChannelUseCase,
    ListConversationsUseCase,
    OpenDirectMessageUseCase,
    ListMessagesUseCase,
    SendMessageUseCase,
    EditMessageUseCase,
    DeleteMessageUseCase,
    MarkConversationReadUseCase,
    SearchMessagesUseCase,
    ListPresenceUseCase,
    MessagingGateway
  ],
  exports: [MessagingGateway]
})
export class MessagingModule {}
