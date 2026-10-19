import { Inject, Injectable } from '@nestjs/common';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import {
  syncPermissionCatalog,
  SyncPermissionCatalogResult,
} from '@core/authorization/permission-catalog-sync';

/**
 * Wrapper fino sobre `syncPermissionCatalog` — usa `PrismaBootstrapService`
 * (RLS-bypass) porque a sync precisa iterar todos os tenants, não só o do
 * request atual. Chamado pelo script `scripts/sync-permission-catalog.ts`
 * (`npm run sync:permissions`).
 */
@Injectable()
export class PermissionCatalogSyncService {
  constructor(
    @Inject(PrismaBootstrapService)
    private readonly prismaBootstrap: PrismaBootstrapService,
  ) {}

  async syncAll(): Promise<SyncPermissionCatalogResult> {
    return syncPermissionCatalog(this.prismaBootstrap);
  }
}
