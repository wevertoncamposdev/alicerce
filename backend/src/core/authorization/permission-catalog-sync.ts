import {
  PERMISSION_CATALOG,
  TENANT_ADMIN_PERMISSION_NAMES,
} from '@core/authorization/permission-catalog';
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
    findMany: (args: {
      where: { tenantId: string; name: { in: string[] } };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
  role: {
    findMany: (args: {
      where: { tenantId: string; isSystem: true; deletedAt: null };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
  rolePermission: {
    createMany: (args: {
      data: Array<{
        tenantId: string;
        roleId: string;
        permissionId: string;
        resource: null;
      }>;
      skipDuplicates: true;
    }) => Promise<{ count: number }>;
  };
}

export interface SyncPermissionCatalogResult {
  tenantsProcessed: number;
  permissionsCreated: number;
  systemRoleGrantsCreated: number;
}

/**
 * Para cada tenant existente: (1) cria as permissões do catálogo que ainda
 * não existem (ADR 0007, etapa 3.3); (2) garante que todo papel de sistema
 * (`isSystem: true`, etapa 3.4) tenha todas as permissões concedíveis do
 * catálogo (`TENANT_ADMIN_PERMISSION_NAMES`). Idempotente via
 * `skipDuplicates` nos dois passos — nunca remove uma permissão ou uma
 * concessão já existente, só adiciona o que falta.
 */
export async function syncPermissionCatalog(
  prisma: PermissionCatalogSyncClient,
): Promise<SyncPermissionCatalogResult> {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  let permissionsCreated = 0;
  let systemRoleGrantsCreated = 0;

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

    const systemRoles = await prisma.role.findMany({
      where: { tenantId: tenant.id, isSystem: true, deletedAt: null },
      select: { id: true },
    });

    if (systemRoles.length === 0) {
      continue;
    }

    const adminPermissions = await prisma.permission.findMany({
      where: {
        tenantId: tenant.id,
        name: { in: [...TENANT_ADMIN_PERMISSION_NAMES] },
      },
      select: { id: true },
    });

    for (const role of systemRoles) {
      const grants = await prisma.rolePermission.createMany({
        data: adminPermissions.map((permission) => ({
          tenantId: tenant.id,
          roleId: role.id,
          permissionId: permission.id,
          resource: null,
        })),
        skipDuplicates: true,
      });
      systemRoleGrantsCreated += grants.count;
    }
  }

  return {
    tenantsProcessed: tenants.length,
    permissionsCreated,
    systemRoleGrantsCreated,
  };
}
