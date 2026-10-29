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
  UseGuards
} from '@nestjs/common'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { AcceptInvitationUseCase } from '../application/accept-invitation.use-case'
import { ChangeMemberRoleUseCase } from '../application/change-member-role.use-case'
import { CreateInvitationsUseCase } from '../application/create-invitations.use-case'
import { CreateWorkspaceUseCase } from '../application/create-workspace.use-case'
import { DeclineInvitationUseCase } from '../application/decline-invitation.use-case'
import { DeleteWorkspaceUseCase } from '../application/delete-workspace.use-case'
import { GetWorkspaceUseCase } from '../application/get-workspace.use-case'
import { ListInvitationsUseCase } from '../application/list-invitations.use-case'
import { ListMembersUseCase } from '../application/list-members.use-case'
import { ListMyInvitationsUseCase } from '../application/list-my-invitations.use-case'
import { ListMyWorkspacesUseCase } from '../application/list-my-workspaces.use-case'
import { RemoveMemberUseCase } from '../application/remove-member.use-case'
import { RevokeInvitationUseCase } from '../application/revoke-invitation.use-case'
import { TransferOwnershipUseCase } from '../application/transfer-ownership.use-case'
import { UpdateWorkspaceUseCase } from '../application/update-workspace.use-case'
import {
  changeRoleSchema,
  createInvitationsSchema,
  createWorkspaceSchema,
  transferSchema,
  updateWorkspaceSchema,
  type ChangeRoleBody,
  type CreateInvitationsBody,
  type CreateWorkspaceBody,
  type TransferBody,
  type UpdateWorkspaceBody
} from './workspaces.schemas'

@Controller()
@UseGuards(SessionAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly createWorkspace: CreateWorkspaceUseCase,
    private readonly listMine: ListMyWorkspacesUseCase,
    private readonly getWorkspace: GetWorkspaceUseCase,
    private readonly updateWorkspace: UpdateWorkspaceUseCase,
    private readonly deleteWorkspace: DeleteWorkspaceUseCase,
    private readonly listMembers: ListMembersUseCase,
    private readonly changeRole: ChangeMemberRoleUseCase,
    private readonly removeMember: RemoveMemberUseCase,
    private readonly transferOwnership: TransferOwnershipUseCase,
    private readonly createInvitations: CreateInvitationsUseCase,
    private readonly listInvitations: ListInvitationsUseCase,
    private readonly revokeInvitation: RevokeInvitationUseCase,
    private readonly listMyInvitations: ListMyInvitationsUseCase,
    private readonly acceptInvitation: AcceptInvitationUseCase,
    private readonly declineInvitation: DeclineInvitationUseCase
  ) {}

  @Get('workspaces')
  async list(@CurrentUser() actorId: string) {
    const data = await this.listMine.execute(actorId)
    return { data }
  }

  @Post('workspaces')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actorId: string,
    @Body(new ZodValidationPipe(createWorkspaceSchema))
    body: CreateWorkspaceBody
  ) {
    return this.createWorkspace.execute({
      actorId,
      name: body.name,
      description: body.description
    })
  }

  @Get('workspaces/:ref')
  get(@CurrentUser() actorId: string, @Param('ref') ref: string) {
    return this.getWorkspace.execute(ref, actorId)
  }

  @Patch('workspaces/:id')
  update(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema))
    body: UpdateWorkspaceBody
  ) {
    return this.updateWorkspace.execute({
      workspaceId: id,
      actorId,
      name: body.name,
      description: body.description
    })
  }

  @Delete('workspaces/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    await this.deleteWorkspace.execute(id, actorId)
  }

  @Get('workspaces/:id/members')
  members(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.listMembers.execute(id, actorId).then((data) => ({ data }))
  }

  @Patch('workspaces/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async role(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body(new ZodValidationPipe(changeRoleSchema)) body: ChangeRoleBody
  ): Promise<void> {
    await this.changeRole.execute({
      workspaceId: id,
      actorId,
      userId,
      role: body.role
    })
  }

  @Delete('workspaces/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async kick(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string
  ): Promise<void> {
    await this.removeMember.execute({
      workspaceId: id,
      actorId,
      userId
    })
  }

  @Post('workspaces/:id/transfer')
  @HttpCode(HttpStatus.NO_CONTENT)
  async transfer(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(transferSchema)) body: TransferBody
  ): Promise<void> {
    await this.transferOwnership.execute({
      workspaceId: id,
      actorId,
      userId: body.userId
    })
  }

  @Get('workspaces/:id/invitations')
  invitations(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.listInvitations.execute(id, actorId).then((data) => ({ data }))
  }

  @Post('workspaces/:id/invitations')
  @HttpCode(HttpStatus.CREATED)
  invite(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(createInvitationsSchema))
    body: CreateInvitationsBody
  ) {
    return this.createInvitations.execute({
      workspaceId: id,
      actorId,
      invites: body.invites
    })
  }

  @Delete('workspaces/:id/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('invitationId', new ParseUUIDPipe({ version: '4' }))
    invitationId: string
  ): Promise<void> {
    await this.revokeInvitation.execute({
      workspaceId: id,
      actorId,
      invitationId
    })
  }

  @Get('invitations')
  mine(@CurrentUser() actorId: string) {
    return this.listMyInvitations.execute(actorId).then((data) => ({ data }))
  }

  @Post('invitations/:id/accept')
  @HttpCode(HttpStatus.CREATED)
  accept(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.acceptInvitation.execute(id, actorId)
  }

  @Post('invitations/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  async decline(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    await this.declineInvitation.execute(id, actorId)
  }
}
