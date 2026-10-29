import { Global, Module } from '@nestjs/common'
import { SessionAuthGuard } from './session-auth.guard'

@Global()
@Module({
  providers: [SessionAuthGuard],
  exports: [SessionAuthGuard]
})
export class IdentityModule {}
