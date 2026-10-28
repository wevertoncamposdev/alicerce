import { Global, Module } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionCatalogSyncService } from './permission-catalog-sync.service';

@Global()
@Module({
  providers: [PermissionCacheService, PermissionCatalogSyncService],
  exports: [PermissionCacheService, PermissionCatalogSyncService],
})
export class AuthorizationModule {}
