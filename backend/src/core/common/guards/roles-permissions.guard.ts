import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RequestWithAuth } from '@core/common/types/http.types';
import { ROLES_KEY } from '@core/common/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '@core/common/decorators/permissions.decorator';

@Injectable()
export class RolesPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  private normalizeValues(values: unknown): string[] {
    if (!values) {
      return [];
    }

    const normalized = new Set<string>();
    // `Array.isArray(x)` com `x: unknown` estreita para `any[]` (quirk do
    // lib.es5.d.ts), não `unknown[]` — por isso o cast explícito, em vez de
    // confiar na narrowing automática do type guard.
    const queue: unknown[] = Array.isArray(values)
      ? [...(values as unknown[])]
      : [values];

    while (queue.length > 0) {
      const current = queue.pop();

      if (typeof current === 'string') {
        const value = current.trim();
        if (value) {
          normalized.add(value.toUpperCase());
        }
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...(current as unknown[]));
        continue;
      }

      if (!current || typeof current !== 'object') {
        continue;
      }

      const item = current as Record<string, unknown>;

      for (const key of [
        'role',
        'type',
        'name',
        'permission',
        'permissionName',
        'roleName',
        'value',
      ]) {
        if (item[key] !== undefined) {
          queue.push(item[key]);
        }
      }

      for (const [key, value] of Object.entries(item)) {
        if (
          ![
            'role',
            'type',
            'name',
            'permission',
            'permissionName',
            'roleName',
            'value',
            'id',
            'tenantId',
          ].includes(key) &&
          value !== null &&
          typeof value === 'object'
        ) {
          queue.push(value);
        }
      }
    }

    return Array.from(normalized);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const { user } = context.switchToHttp().getRequest<RequestWithAuth>();

    // Roles continuam vindo do JWT — mudam raramente (atribuir/trocar role de
    // alguém já é uma ação administrativa pouco frequente), então a janela de
    // staleness até o token expirar (15min) é aceitável. Decisão confirmada
    // com o usuário ao implementar o P7.5 (ver PLAN.md).
    const userRoles = this.normalizeValues(user?.roles);

    if (
      requiredRoles &&
      !requiredRoles.some((role) =>
        userRoles.includes(String(role).trim().toUpperCase()),
      )
    ) {
      throw new ForbiddenException('Acesso negado: role insuficiente');
    }

    if (requiredPermissions) {
      // Permissions, ao contrário de roles, vêm de uma consulta fresca
      // (cache Redis de TTL curto, cai para o Postgres no miss) — não do
      // JWT. É o ponto do P7.5: revogar uma permissão passa a valer em
      // segundos, não só quando o access token expira.
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
