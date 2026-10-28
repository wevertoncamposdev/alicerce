import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesPermissionsGuard } from './roles-permissions.guard';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

describe('RolesPermissionsGuard', () => {
  let permissionCacheMock: { getFreshPermissions: jest.Mock };

  // Classe nova a cada chamada — `Reflect.defineMetadata` gravaria na mesma
  // classe pra sempre se fosse compartilhada entre testes, vazando metadata
  // de um teste anterior pro próximo (ex.: o teste "sem @Permissions"
  // herdaria o `requiredPermissions` de um teste rodado antes dele).
  // `null` (não `undefined`) significa "sem @Permissions" — um parâmetro
  // default em JS também dispara para `undefined` passado explicitamente,
  // não só quando omitido.
  const buildContext = (
    user: Record<string, unknown>,
    requiredPermissions: string[] | null = ['user.read'],
  ): ExecutionContext => {
    class TestController {}
    const handler = () => undefined;
    if (requiredPermissions) {
      Reflect.defineMetadata('permissions', requiredPermissions, handler);
      Reflect.defineMetadata(
        'permissions',
        requiredPermissions,
        TestController,
      );
    }

    return {
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    permissionCacheMock = { getFreshPermissions: jest.fn() };
  });

  const buildGuard = () =>
    new RolesPermissionsGuard(
      new Reflector(),
      permissionCacheMock as unknown as PermissionCacheService,
    );

  it('allows when a fresh permission from the cache matches', async () => {
    permissionCacheMock.getFreshPermissions.mockResolvedValue(['USER.READ']);
    const guard = buildGuard();
    const context = buildContext({ sub: 'user-1', tenantId: 'tenant-1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionCacheMock.getFreshPermissions).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
    );
  });

  it('denies when the cache (fresh source) no longer has the permission', async () => {
    // ADR 0007 (etapa 3.6): a checagem é só por permissão fresca
    // (cache/DB), não mais pelo JWT — a permissão pode ter sido revogada
    // depois do login, antes do token expirar.
    permissionCacheMock.getFreshPermissions.mockResolvedValue([]);
    const guard = buildGuard();
    const context = buildContext({ sub: 'user-1', tenantId: 'tenant-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Acesso negado: permission insuficiente',
    );
  });

  it('treats a missing tenantId/sub as no permissions (fails closed, not open)', async () => {
    const guard = buildGuard();
    const context = buildContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Acesso negado: permission insuficiente',
    );
    expect(permissionCacheMock.getFreshPermissions).not.toHaveBeenCalled();
  });

  it('allows a route with no @Permissions metadata, never touching the cache', async () => {
    const guard = buildGuard();
    const context = buildContext({ sub: 'user-1', tenantId: 'tenant-1' }, null);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionCacheMock.getFreshPermissions).not.toHaveBeenCalled();
  });
});
