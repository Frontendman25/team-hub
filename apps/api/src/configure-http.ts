import type { INestApplication } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { ConfigService } from '@nestjs/config'
import type { NextFunction, Request, Response } from 'express'
import { AppErrorFilter } from './shared/presentation/app-error.filter'
import type { Env } from './infrastructure/config/env'
import { isMutatingMethod, originAllowed } from './infrastructure/http/origin'

export function configureHttp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>)
  const frontendUrl = config.get('FRONTEND_URL', { infer: true })

  if (config.get('TRUST_PROXY', { infer: true })) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1)
  }

  app.enableCors({
    origin: frontendUrl,
    credentials: true
  })
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isMutatingMethod(req.method)) {
      next()
      return
    }

    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (originAllowed(origin, frontendUrl)) {
      next()
      return
    }

    res.status(403).json({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Origin not allowed'
    })
  })
  app.useLogger(app.get(Logger))
  app.useGlobalFilters(new AppErrorFilter())
}
