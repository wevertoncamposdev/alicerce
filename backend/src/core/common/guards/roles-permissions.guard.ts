import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RequestWithAuth } from '@core/common/types/http.types';
import { PERMISSIONS_KEY } from '@core/common/decorators/permissions.decorator';

/**
 * ADR 0007 (etapa 3.6): o acesso é decidido só por `@Permissions` —
 * `@Roles`/`ROLES_KEY` foram removidos (a etapa 3.2 já tinha tirado todo
 * uso de `@Roles` dos controllers; `roles` saiu do JWT na mesma etapa desta
 * limpeza).
 */
@Injectable()
export class RolesPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const { user } = context.switchToHttp().getRequest<RequestWithAuth>();

    if (requiredPermissions) {
      // Permissions vêm de uma consulta fresca (cache Redis de TTL curto,
      // cai para o Postgres no miss) — não do JWT: revogar uma permissão
      // passa a valer em segundos, não só quando o access token expira.
      const tenantId: string | undefined = user?.tenantId;
      const userId: string | undefined = user?.sub;

      const freshPermissions =
        tenantId && userId
          ? await this.permissionCache.getFreshPermissions(tenantId, userId)
          : [];

      const normalizedFresh = freshPermissions.map((p) => p.toUpperCase());

      if (
        !requiredPermissions.some((permission) =>
          normalizedFresh.includes(String(permission).trim().toUpperCase()),
        )
      ) {
        throw new ForbiddenException('Acesso negado: permission insuficiente');
      }
    }

    return true;
  }
}
