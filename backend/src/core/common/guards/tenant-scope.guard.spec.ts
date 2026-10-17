import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@core/auth/auth.guard';
import { TenantScopeGuard } from './tenant-scope.guard';

class TestController {}

function buildContext(
  request: Record<string, unknown>,
  isPublic = false,
): ExecutionContext {
  const handler = () => undefined;

  if (isPublic) {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  }

  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('TenantScopeGuard', () => {
  it('libera rotas marcadas @Public() sem exigir tenantId no contexto', () => {
    const guard = new TenantScopeGuard(new Reflector());
    const request: Record<string, unknown> = { params: {} };

    expect(guard.canActivate(buildContext(request, true))).toBe(true);
    expect(request.tenantId).toBeUndefined();
  });

  it('bloqueia uma rota autenticada sem tenantId resolvido em nenhuma fonte', () => {
    const guard = new TenantScopeGuard(new Reflector());
    const request = { params: {}, user: {} };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      ForbiddenException,
    );
  });

  it('aceita o tenantId do usuário autenticado (JWT) quando não há :tenantId na rota', () => {
    const guard = new TenantScopeGuard(new Reflector());
    const request: Record<string, unknown> = {
      params: {},
      user: { tenantId: 'tenant-1' },
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(request.tenantId).toBe('tenant-1');
  });

  it('prioriza o tenantId já resolvido por middleware (request.tenantId) sobre o do JWT', () => {
    const guard = new TenantScopeGuard(new Reflector());
    const request: Record<string, unknown> = {
      params: {},
      tenantId: 'tenant-from-middleware',
      user: { tenantId: 'tenant-from-middleware' },
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(request.tenantId).toBe('tenant-from-middleware');
  });

  it('bloqueia quando o :tenantId da rota não bate com o tenant do contexto autenticado', () => {
    const guard = new TenantScopeGuard(new Reflector());
    const request = {
      params: { tenantId: 'tenant-outro' },
      user: { tenantId: 'tenant-1' },
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      ForbiddenException,
    );
  });

  it('aceita quando o :tenantId da rota bate com o tenant do contexto autenticado', () => {
    const guard = new TenantScopeGuard(new Reflector());
    const request: Record<string, unknown> = {
      params: { tenantId: 'tenant-1' },
      user: { tenantId: 'tenant-1' },
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(request.tenantId).toBe('tenant-1');
  });
});
