import { Injectable } from '@nestjs/common'
import { PresenceService } from '../infrastructure/presence.service'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class ListPresenceUseCase {
  constructor(
    private readonly presence: PresenceService,
    private readonly access: ConversationAccess
  ) {}

  async execute(workspaceId: string, actorId: string) {
    await this.access.requireMember(workspaceId, actorId)
    const userIds = await this.presence.listOnline(workspaceId)
    return { userIds }
  }
}
