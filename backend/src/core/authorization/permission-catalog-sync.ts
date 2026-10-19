import { PERMISSION_CATALOG } from '@core/authorization/permission-catalog';
import { PermissionType } from '@core/prisma/generated/enums';

/**
 * Superfície mínima do Prisma Client que a sync precisa — permite reusar a
 * mesma função tanto com `PrismaBootstrapService` (RLS-bypass, usado pelo
 * NestJS) quanto com o `PrismaClient` cru que `prisma/seed.ts` já instancia
 * fora do container do Nest.
 */
export interface PermissionCatalogSyncClient {
  tenant: {
    findMany: (args: {
      where: { deletedAt: null };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
  permission: {
    createMany: (args: {
      data: Array<{
        tenantId: string;
        name: string;
        type: PermissionType;
        resource: string;
        description: string;
      }>;
      skipDuplicates: true;
    }) => Promise<{ count: number }>;
  };
}

export interface SyncPermissionCatalogResult {
  tenantsProcessed: number;
  permissionsCreated: number;
}

/**
 * Cria, em todo tenant existente, as permissões do catálogo que ainda não
 * existem (ADR 0007, etapa 3.3) — idempotente via `skipDuplicates`. Nunca
 * remove uma permissão: tirar algo do catálogo é sempre uma migration
 * explícita (ver etapa 3.3, remoção de `permission.create/update/delete`).
 */
export async function syncPermissionCatalog(
  prisma: PermissionCatalogSyncClient,
): Promise<SyncPermissionCatalogResult> {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  let permissionsCreated = 0;

  for (const tenant of tenants) {
    const created = await prisma.permission.createMany({
      data: PERMISSION_CATALOG.map((permission) => ({
        tenantId: tenant.id,
        name: permission.name,
        type: permission.type,
        resource: permission.resource,
        description: permission.description,
      })),
      skipDuplicates: true,
    });
    permissionsCreated += created.count;
  }

  return { tenantsProcessed: tenants.length, permissionsCreated };
}
