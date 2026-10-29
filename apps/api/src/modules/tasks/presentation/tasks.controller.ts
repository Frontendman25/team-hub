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
import { MessagingGateway } from '../../messaging/presentation/messaging.gateway'
import { CreateTaskUseCase } from '../application/create-task.use-case'
import { DeleteTaskUseCase } from '../application/delete-task.use-case'
import { GetTaskUseCase } from '../application/get-task.use-case'
import { ListTasksUseCase } from '../application/list-tasks.use-case'
import { MoveTaskUseCase } from '../application/move-task.use-case'
import { UpdateTaskUseCase } from '../application/update-task.use-case'
import {
  createTaskSchema,
  listTasksQuerySchema,
  moveTaskSchema,
  updateTaskSchema,
  type CreateTaskBody,
  type ListTasksQueryDto,
  type MoveTaskBody,
  type UpdateTaskBody
} from './tasks.schemas'

@Controller()
@UseGuards(SessionAuthGuard)
export class TasksController {
  constructor(
    private readonly listTasks: ListTasksUseCase,
    private readonly getTask: GetTaskUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly moveTask: MoveTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly realtime: MessagingGateway
  ) {}

  @Get('workspaces/:workspaceId/tasks')
  async list(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQueryDto
  ) {
    const data = await this.listTasks.execute({
      workspaceId,
      actorId,
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId === 'unassigned' ? null : query.assigneeId
    })
    return { data }
  }

  @Post('workspaces/:workspaceId/tasks')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskBody
  ) {
    const task = await this.createTask.execute({
      workspaceId,
      actorId,
      ...body
    })
    this.realtime.broadcastWorkspace(workspaceId, 'task.changed', {
      workspaceId,
      taskId: task.id,
      action: 'created'
    })
    return task
  }

  @Get('tasks/:id')
  get(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.getTask.execute(id, actorId)
  }

  @Patch('tasks/:id')
  async update(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskBody
  ) {
    const task = await this.updateTask.execute({
      taskId: id,
      actorId,
      expectedVersion: body.version,
      title: body.title,
      description: body.description,
      priority: body.priority,
      assigneeId: body.assigneeId,
      dueDate: body.dueDate
    })
    this.realtime.broadcastWorkspace(task.workspaceId, 'task.changed', {
      workspaceId: task.workspaceId,
      taskId: task.id,
      action: 'updated'
    })
    return task
  }

  @Post('tasks/:id/move')
  async move(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(moveTaskSchema)) body: MoveTaskBody
  ) {
    const result = await this.moveTask.execute({
      taskId: id,
      actorId,
      status: body.status,
      position: body.position,
      expectedVersion: body.version
    })
    this.realtime.broadcastWorkspace(result.task.workspaceId, 'task.changed', {
      workspaceId: result.task.workspaceId,
      taskId: result.task.id,
      action: 'moved'
    })
    return result
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    const task = await this.getTask.execute(id, actorId)
    await this.deleteTask.execute(id, actorId)
    this.realtime.broadcastWorkspace(task.workspaceId, 'task.changed', {
      workspaceId: task.workspaceId,
      taskId: id,
      action: 'deleted'
    })
  }
}
