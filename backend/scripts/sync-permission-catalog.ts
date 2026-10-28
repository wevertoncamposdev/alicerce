import { NestFactory } from '@nestjs/core';
import { ScriptsModule } from './scripts.module';
import { PermissionCatalogSyncService } from '../src/core/authorization/permission-catalog-sync.service';

async function run() {
  const app = await NestFactory.createApplicationContext(ScriptsModule, {
    logger: false,
  });

  try {
    const service = app.get(PermissionCatalogSyncService);
    const result = await service.syncAll();
    console.log(
      `syncPermissionCatalog: ${result.tenantsProcessed} tenant(s), ${result.permissionsCreated} permissão(ões) nova(s), ${result.systemRoleGrantsCreated} concessão(ões) de papel de sistema.`,
    );
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('sync-permission-catalog failed', err);
  process.exit(1);
});
