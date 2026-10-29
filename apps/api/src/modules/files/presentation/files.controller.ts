import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { CompleteUploadUseCase } from '../application/complete-upload.use-case'
import { DeleteFileUseCase } from '../application/delete-file.use-case'
import { GetDownloadUseCase } from '../application/get-download.use-case'
import { InitiateUploadUseCase } from '../application/initiate-upload.use-case'
import { ReceiveUploadUseCase } from '../application/receive-upload.use-case'
import { ListWorkspaceFilesUseCase } from '../application/list-workspace-files.use-case'
import { StreamFileUseCase } from '../application/stream-file.use-case'
import {
  initiateUploadSchema,
  listFilesQuerySchema,
  type InitiateUploadBody,
  type ListFilesQuery
} from './files.schemas'

@Controller()
@UseGuards(SessionAuthGuard)
export class FilesController {
  constructor(
    private readonly initiateUpload: InitiateUploadUseCase,
    private readonly receiveUpload: ReceiveUploadUseCase,
    private readonly completeUpload: CompleteUploadUseCase,
    private readonly listFiles: ListWorkspaceFilesUseCase,
    private readonly getDownload: GetDownloadUseCase,
    private readonly streamFile: StreamFileUseCase,
    private readonly deleteFile: DeleteFileUseCase
  ) {}

  @Post('workspaces/:workspaceId/files')
  @HttpCode(HttpStatus.CREATED)
  initiate(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Body(new ZodValidationPipe(initiateUploadSchema)) body: InitiateUploadBody
  ) {
    return this.initiateUpload.execute({
      workspaceId,
      actorId,
      originalName: body.originalName,
      contentType: body.contentType,
      byteSize: body.byteSize
    })
  }

  @Get('workspaces/:workspaceId/files')
  async list(
    @CurrentUser() actorId: string,
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Query(new ZodValidationPipe(listFilesQuerySchema)) query: ListFilesQuery
  ) {
    const result = await this.listFiles.execute({
      workspaceId,
      actorId,
      limit: query.limit,
      offset: query.offset
    })
    return {
      data: result.items,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: result.total
      }
    }
  }

  @Put('files/:id/content')
  @HttpCode(HttpStatus.NO_CONTENT)
  async receive(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request
  ): Promise<void> {
    const bytes = await readRawBody(request)
    await this.receiveUpload.execute({ fileId: id, actorId, bytes })
  }

  @Post('files/:id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.completeUpload.execute({ fileId: id, actorId })
  }

  @Get('files/:id/content-url')
  contentUrl(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.getDownload.execute({ fileId: id, actorId })
  }

  @Get('files/:id/content')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, max-age=60')
  @Header('Accept-Ranges', 'bytes')
  async content(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.streamFile.execute({
      fileId: id,
      actorId,
      rangeHeader: Array.isArray(request.headers.range)
        ? request.headers.range[0]
        : request.headers.range
    })
    const encoded = encodeURIComponent(result.file.originalName)
    if (result.partial) {
      response.status(HttpStatus.PARTIAL_CONTENT)
      response.setHeader(
        'Content-Range',
        `bytes ${result.partial.start}-${result.partial.end}/${result.totalSize}`
      )
    }
    return new StreamableFile(result.body, {
      type: result.file.contentType,
      length: result.contentLength,
      disposition: `${result.disposition}; filename="${encoded}"; filename*=UTF-8''${encoded}`
    })
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<void> {
    await this.deleteFile.execute({ fileId: id, actorId })
  }
}

async function readRawBody(request: Request): Promise<Buffer> {
  if (Buffer.isBuffer(request.body)) {
    return request.body
  }
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
