import { randomUUID } from 'node:crypto'
import { LoggerModule } from 'nestjs-pino'
import type { IncomingMessage, ServerResponse } from 'node:http'

function readRequestId(req: IncomingMessage): string {
  const header = req.headers['x-request-id']
  if (typeof header === 'string' && header.length > 0) {
    return header
  }
  return randomUUID()
}

export const loggerModule = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    genReqId: readRequestId,
    customProps: (req: IncomingMessage) => ({
      requestId: String(req.id)
    }),
    serializers: {
      req: (req: IncomingMessage) => ({
        id: req.id,
        method: req.method,
        url: req.url
      }),
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode
      })
    },
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true
            }
          }
  }
})
