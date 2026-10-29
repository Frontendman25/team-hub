import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common'
import type { Response } from 'express'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { CountUnreadNotificationsUseCase } from '../application/count-unread-notifications.use-case'
import { ListNotificationsUseCase } from '../application/list-notifications.use-case'
import { MarkAllNotificationsReadUseCase } from '../application/mark-all-notifications-read.use-case'
import { MarkNotificationReadUseCase } from '../application/mark-notification-read.use-case'
import {
  listNotificationsQuerySchema,
  type ListNotificationsQueryDto
} from './notifications.schemas'

@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly countUnread: CountUnreadNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly markAllRead: MarkAllNotificationsReadUseCase
  ) {}

  @Get()
  async list(
    @CurrentUser() recipientId: string,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema))
    query: ListNotificationsQueryDto
  ) {
    const data = await this.listNotifications.execute(recipientId, query.limit)
    return { data }
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentUser() recipientId: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.countUnread.execute(recipientId)
    response.setHeader('X-TeamHub-Cache', result.cache)
    return { count: result.count }
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async readOne(
    @CurrentUser() recipientId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    await this.markRead.execute(id, recipientId)
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async readAll(@CurrentUser() recipientId: string): Promise<void> {
    await this.markAllRead.execute(recipientId)
  }
}
