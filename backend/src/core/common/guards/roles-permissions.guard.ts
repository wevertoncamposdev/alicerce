import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  private normalizeValues(values: unknown): string[] {
    if (!values) {
      return [];
    }

    const normalized = new Set<string>();
    const queue: unknown[] = Array.isArray(values) ? [...values] : [values];

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
        queue.push(...current);
        continue;
      }

      if (!current || typeof current !== 'object') {
        continue;
      }

      const item = current as Record<string, unknown>;

      for (const key of ['role', 'type', 'name', 'permission', 'permissionName', 'roleName', 'value']) {
        if (item[key] !== undefined) {
          queue.push(item[key]);
        }
      }

      for (const [key, value] of Object.entries(item)) {
        if (!['role', 'type', 'name', 'permission', 'permissionName', 'roleName', 'value', 'id', 'tenantId'].includes(key) && value !== null && typeof value === 'object') {
          queue.push(value);
        }
      }
    }

    return Array.from(normalized);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    const { user } = context.switchToHttp().getRequest();

    const userRoles = this.normalizeValues(user?.roles ?? user?.role ?? user?.roleNames);
    const userPermissions = this.normalizeValues(user?.permissions ?? user?.permissionNames);

    if (requiredRoles && !requiredRoles.some((role) => userRoles.includes(String(role).trim().toUpperCase()))) {
      throw new ForbiddenException('Acesso negado: role insuficiente');
    }
    if (requiredPermissions && !requiredPermissions.some((permission) => userPermissions.includes(String(permission).trim().toUpperCase()))) {
      throw new ForbiddenException('Acesso negado: permission insuficiente');
    }

    return true;
  }
}
