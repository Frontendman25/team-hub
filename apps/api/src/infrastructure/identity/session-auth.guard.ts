import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { UnauthorizedError } from '../../shared/domain/errors'
import type { TeamHubRequest } from '../http/request'

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TeamHubRequest>()
    if (!request.userId) {
      throw new UnauthorizedError('Authentication required')
    }
    return true
  }
}
