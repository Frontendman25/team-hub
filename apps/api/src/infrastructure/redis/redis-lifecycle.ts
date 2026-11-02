import { Injectable, Logger } from '@nestjs/common'

type ReadyHandler = () => Promise<unknown> | void

@Injectable()
export class RedisLifecycle {
  private readonly logger = new Logger(RedisLifecycle.name)
  private readonly handlers = new Set<ReadyHandler>()
  private restoring = false
  private pendingSource: string | null = null

  onRestored(handler: ReadyHandler): void {
    this.handlers.add(handler)
  }

  async notifyRestored(source: string): Promise<void> {
    if (this.restoring) {
      this.pendingSource = source
      return
    }
    this.restoring = true
    let current = source
    try {
      do {
        this.pendingSource = null
        this.logger.warn(
          `Redis connection restored (${current}); running recovery`
        )
        for (const handler of this.handlers) {
          await handler()
        }
        current = this.pendingSource ?? ''
      } while (this.pendingSource)
    } catch (error) {
      this.logger.error(
        `Redis recovery failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
    } finally {
      this.restoring = false
    }
  }
}
