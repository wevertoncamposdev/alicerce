import { Global, Module } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service';

@Global()
@Module({
  providers: [PermissionCacheService],
  exports: [PermissionCacheService],
})
export class AuthorizationModule {}
