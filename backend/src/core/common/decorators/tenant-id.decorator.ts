import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RequestWithAuth } from '@core/common/types/http.types';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    const paramTenantId = request.params?.tenantId;
    const headerValue = request.headers['x-tenant-id'];
    const headerTenantId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    const tenantId =
      request.tenantId ?? request.user?.tenantId ?? headerTenantId;

    if (paramTenantId && tenantId && paramTenantId !== tenantId) {
      throw new ForbiddenException(
        'TenantId da rota não confere com o contexto',
      );
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
