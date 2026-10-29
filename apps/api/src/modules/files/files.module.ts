import { Inject, Module, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../infrastructure/config/env'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { CompleteUploadUseCase } from './application/complete-upload.use-case'
import { DeleteFileUseCase } from './application/delete-file.use-case'
import { FileAccess } from './application/file-access'
import { GetDownloadUseCase } from './application/get-download.use-case'
import { HydrateAttachments } from './application/hydrate-attachments'
import { InitiateUploadUseCase } from './application/initiate-upload.use-case'
import { ReceiveUploadUseCase } from './application/receive-upload.use-case'
import { ListWorkspaceFilesUseCase } from './application/list-workspace-files.use-case'
import { StreamFileUseCase } from './application/stream-file.use-case'
import type { FilesRepository } from './domain/files.repository'
import type { ObjectStorage } from './domain/object-storage'
import { DrizzleFilesRepository } from './infrastructure/drizzle-files.repository'
import { MemoryObjectStorage } from './infrastructure/memory-object-storage'
import { S3ObjectStorage } from './infrastructure/s3-object-storage'
import { UploadRateLimiter } from './infrastructure/upload-rate-limiter'
import { FILES_REPOSITORY, OBJECT_STORAGE } from './files.tokens'
import { FilesController } from './presentation/files.controller'

@Module({
  imports: [WorkspacesModule],
  controllers: [FilesController],
  providers: [
    {
      provide: FILES_REPOSITORY,
      useFactory: (drizzle: DrizzleService): FilesRepository =>
        new DrizzleFilesRepository(drizzle.db),
      inject: [DrizzleService]
    },
    {
      provide: OBJECT_STORAGE,
      useFactory: (config: ConfigService<Env, true>): ObjectStorage => {
        const driver = config.get('STORAGE_DRIVER', { infer: true })
        if (driver === 's3') {
          return new S3ObjectStorage(config)
        }
        return new MemoryObjectStorage()
      },
      inject: [ConfigService]
    },
    UploadRateLimiter,
    FileAccess,
    HydrateAttachments,
    InitiateUploadUseCase,
    ReceiveUploadUseCase,
    CompleteUploadUseCase,
    ListWorkspaceFilesUseCase,
    GetDownloadUseCase,
    StreamFileUseCase,
    DeleteFileUseCase
  ],
  exports: [FILES_REPOSITORY, HydrateAttachments, OBJECT_STORAGE]
})
export class FilesModule implements OnModuleInit {
  constructor(
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage
  ) {}

  async onModuleInit(): Promise<void> {
    await this.storage.ensureReady()
  }
}
