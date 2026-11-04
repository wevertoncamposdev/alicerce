import { ForbiddenException } from '@nestjs/common';
import { PERMISSION_CATALOG } from './permission-catalog';
import { PermissionCacheService } from './permission-cache.service';

export type EntityPermissionAction = 'read' | 'update';
export type EntityPermissionResult = 'granted' | 'denied' | 'unknown-entity';

/**
 * Permissão herdada do registro (U6, docs/PLAN-fundacao-ux.md): Notas/
 * Tags/Anexos não têm entrada própria no catálogo — quem lê/altera o
 * registro lê/altera os metadados dele. `entity` é o prefixo de recurso
 * do catálogo (ex. "feedback"), igual ao que já aparece em
 * `permission-catalog.ts` (`feedback.read`, `feedback.update`...).
 *
 * `"unknown-entity"` existe pra separar dois casos que o chamador trata
 * diferente: `core/metadata` (Notas/Tags, recurso novo, sem
 * compatibilidade a preservar) nega por padrão; `core/files` (Anexos,
 * reaproveita o endpoint de upload que já existe sem checagem nenhuma
 * pra avatar/logo) libera por padrão quando `ownerType` não é um recurso
 * do catálogo, preservando o comportamento atual desses dois usos.
 */
export function checkEntityPermission(
  permissions: string[],
  entity: string,
  action: EntityPermissionAction,
): EntityPermissionResult {
  const normalizedEntity = entity.trim().toLowerCase();
  if (!normalizedEntity) {
    return 'unknown-entity';
  }

  const permissionName = `${normalizedEntity}.${action}`;
  const existsInCatalog = PERMISSION_CATALOG.some(
    (definition) => definition.name.toLowerCase() === permissionName,
  );

  if (!existsInCatalog) {
    return 'unknown-entity';
  }

  const normalizedFresh = permissions.map((p) => p.toUpperCase());
  return normalizedFresh.includes(permissionName.toUpperCase())
    ? 'granted'
    : 'denied';
}

/**
 * Busca as permissões frescas do usuário e lança `ForbiddenException` se
 * ele não puder `action` em `entity`. `denyOnUnknownEntity`: `core/
 * metadata` (Notas/Tags, recurso novo) usa o default `true`; `core/files`
 * (Anexos, endpoint que já era aberto pra avatar/logo) passa `false` pra
 * preservar esse comportamento quando `ownerType` não é um recurso do
 * catálogo.
 */
export async function assertEntityAccess(
  permissionCache: PermissionCacheService,
  tenantId: string,
  userId: string,
  entity: string,
  action: EntityPermissionAction,
  denyOnUnknownEntity = true,
): Promise<void> {
  const permissions = await permissionCache.getFreshPermissions(
    tenantId,
    userId,
  );
  const result = checkEntityPermission(permissions, entity, action);
  const allowed =
    result === 'granted' ||
    (!denyOnUnknownEntity && result === 'unknown-entity');

  if (!allowed) {
    throw new ForbiddenException(
      'Acesso negado: permissão insuficiente para este registro',
    );
  }
}
