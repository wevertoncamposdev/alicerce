import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('TenantId não encontrado no contexto');
    }
    return tenantId;
  },
);
