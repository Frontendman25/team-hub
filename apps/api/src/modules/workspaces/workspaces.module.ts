import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import type { Env } from '../../infrastructure/config/env'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { AcceptInvitationUseCase } from './application/accept-invitation.use-case'
import { ChangeMemberRoleUseCase } from './application/change-member-role.use-case'
import { CreateInvitationsUseCase } from './application/create-invitations.use-case'
import { CreateWorkspaceUseCase } from './application/create-workspace.use-case'
import { DeclineInvitationUseCase } from './application/decline-invitation.use-case'
import { DeleteWorkspaceUseCase } from './application/delete-workspace.use-case'
import { GetWorkspaceUseCase } from './application/get-workspace.use-case'
import { ListInvitationsUseCase } from './application/list-invitations.use-case'
import { ListMembersUseCase } from './application/list-members.use-case'
import { ListMyInvitationsUseCase } from './application/list-my-invitations.use-case'
import { ListMyWorkspacesUseCase } from './application/list-my-workspaces.use-case'
import { NotifyInvitationUseCase } from './application/notify-invitation.use-case'
import { RemoveMemberUseCase } from './application/remove-member.use-case'
import { RevokeInvitationUseCase } from './application/revoke-invitation.use-case'
import { TransferOwnershipUseCase } from './application/transfer-ownership.use-case'
import { UpdateWorkspaceUseCase } from './application/update-workspace.use-case'
import { GuestWriteLimiter } from '../auth/infrastructure/guest-write-limiter'
import { DemoPolicy } from './application/demo-policy'
import { WorkspaceAccess } from './application/workspace-access'
import type { WorkspaceRepository } from './domain/workspace.repository'
import { DrizzleWorkspaceRepository } from './infrastructure/drizzle-workspace.repository'
import {
  InvitationQueue,
  INVITATION_QUEUE_NAME
} from './infrastructure/invitation.queue'
import { InvitationWorker } from './infrastructure/invitation.worker'
import { WorkspacesController } from './presentation/workspaces.controller'
import { INVITATION_QUEUE, WORKSPACES_REPOSITORY } from './workspaces.tokens'

@Module({
  imports: [NotificationsModule],
  controllers: [WorkspacesController],
  providers: [
    {
      provide: WORKSPACES_REPOSITORY,
      useFactory: (drizzle: DrizzleService): WorkspaceRepository =>
        new DrizzleWorkspaceRepository(drizzle.db),
      inject: [DrizzleService]
    },
    {
      provide: INVITATION_QUEUE,
      useFactory: (config: ConfigService<Env, true>) => {
        const connection = new Redis(config.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: null
        })
        return new Queue(INVITATION_QUEUE_NAME, { connection })
      },
      inject: [ConfigService]
    },
    InvitationQueue,
    InvitationWorker,
    WorkspaceAccess,
    DemoPolicy,
    GuestWriteLimiter,
    CreateWorkspaceUseCase,
    ListMyWorkspacesUseCase,
    GetWorkspaceUseCase,
    UpdateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    ListMembersUseCase,
    ChangeMemberRoleUseCase,
    RemoveMemberUseCase,
    TransferOwnershipUseCase,
    CreateInvitationsUseCase,
    ListInvitationsUseCase,
    RevokeInvitationUseCase,
    ListMyInvitationsUseCase,
    AcceptInvitationUseCase,
    DeclineInvitationUseCase,
    NotifyInvitationUseCase
  ],
  exports: [
    WorkspaceAccess,
    WORKSPACES_REPOSITORY,
    DemoPolicy,
    GuestWriteLimiter
  ]
})
export class WorkspacesModule {
  constructor(
    private readonly _invitationQueue: InvitationQueue,
    private readonly _invitationWorker: InvitationWorker
  ) {}
}
