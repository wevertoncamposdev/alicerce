import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;
    const paramTenantId = request.params['tenantId'];
    // Se a rota exige tenantId, ele deve bater com o do contexto
    if (paramTenantId && tenantId && paramTenantId !== tenantId) {
      throw new ForbiddenException('Acesso negado ao tenant');
    }
    return true;
  }
}
