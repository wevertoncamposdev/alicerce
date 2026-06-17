import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const paramTenantId = request.params['tenantId'];
    const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
    const resolvedTenantId =
      request.tenantId ?? request.user?.tenantId ?? headerTenantId;

    if (paramTenantId && !resolvedTenantId) {
      throw new ForbiddenException('TenantId não encontrado no contexto');
    }

    // Se a rota exige tenantId, ele deve bater com o contexto (header/jwt/middleware).
    if (paramTenantId && resolvedTenantId && paramTenantId !== resolvedTenantId) {
      throw new ForbiddenException('Acesso negado ao tenant');
    }

    request.tenantId = resolvedTenantId ?? paramTenantId;
    return true;
  }
}
