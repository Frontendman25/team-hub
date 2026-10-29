import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import type { Response } from 'express'
import { AppError } from '../domain/errors'

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()

    if (exception instanceof AppError) {
      if (
        exception.statusCode === HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE &&
        exception.details &&
        typeof exception.details === 'object' &&
        'total' in exception.details
      ) {
        response.setHeader(
          'Content-Range',
          `bytes */${String((exception.details as { total: unknown }).total)}`
        )
      }
      response.status(exception.statusCode).json({
        statusCode: exception.statusCode,
        code: exception.code,
        message: exception.message,
        ...(exception.details !== undefined
          ? { details: exception.details }
          : {})
      })
      return
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      response
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, message: body }
            : body
        )
      return
    }

    this.logger.error(exception)
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    })
  }
}
