import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const paramTenantId = request.params['tenantId'] as string | undefined;
    const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
    const tenantId = request.tenantId ?? request.user?.tenantId ?? headerTenantId;

    if (paramTenantId && tenantId && paramTenantId !== tenantId) {
      throw new ForbiddenException('TenantId da rota não confere com o contexto');
    }

    if (paramTenantId) {
      return paramTenantId;
    }

    if (!tenantId) {
      throw new ForbiddenException('TenantId não encontrado no contexto');
    }

    return tenantId;
  },
);
