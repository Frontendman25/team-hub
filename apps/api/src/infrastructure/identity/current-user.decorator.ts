import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { TeamHubRequest } from '../http/request'
import { UnauthorizedError } from '../../shared/domain/errors'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<TeamHubRequest>()
    if (!request.userId) {
      throw new UnauthorizedError('Authentication required')
    }
    return request.userId
  }
)

export const OptionalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<TeamHubRequest>()
    return request.userId
  }
)
