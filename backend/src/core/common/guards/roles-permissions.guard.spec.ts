import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesPermissionsGuard } from './roles-permissions.guard';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

class TestController {}

describe('RolesPermissionsGuard', () => {
  let permissionCacheMock: { getFreshPermissions: jest.Mock };

  const buildContext = (user: Record<string, unknown>): ExecutionContext => {
    const handler = () => undefined;
    Reflect.defineMetadata('roles', ['ADMIN'], handler);
    Reflect.defineMetadata('roles', ['ADMIN'], TestController);
    Reflect.defineMetadata('permissions', ['user.read'], handler);
    Reflect.defineMetadata('permissions', ['user.read'], TestController);

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

  it('accepts nested role objects from the JWT and a fresh permission from the cache', async () => {
    permissionCacheMock.getFreshPermissions.mockResolvedValue(['USER.READ']);
    const guard = buildGuard();
    const context = buildContext({
      sub: 'user-1',
      tenantId: 'tenant-1',
      roles: [{ role: { type: 'Admin' } }, 'USER'],
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionCacheMock.getFreshPermissions).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
    );
  });

  it('denies when the cache (fresh source) no longer has the permission, even if the JWT role still matches', async () => {
    // Este é o cenário que o P7.5 resolve: a permissão foi revogada depois
    // do login, mas o token ainda não expirou — antes, a checagem só olhava
    // o JWT e deixaria passar; agora a fonte fresca (cache/DB) manda.
    permissionCacheMock.getFreshPermissions.mockResolvedValue([]);
    const guard = buildGuard();
    const context = buildContext({
      sub: 'user-1',
      tenantId: 'tenant-1',
      roles: ['ADMIN'],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Acesso negado: permission insuficiente',
    );
  });

  it('denies based on role before even consulting the permission cache', async () => {
    const guard = buildGuard();
    const context = buildContext({
      sub: 'user-1',
      tenantId: 'tenant-1',
      roles: ['USER'],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Acesso negado: role insuficiente',
    );
    expect(permissionCacheMock.getFreshPermissions).not.toHaveBeenCalled();
  });

  it('treats a missing tenantId/sub as no permissions (fails closed, not open)', async () => {
    const guard = buildGuard();
    const context = buildContext({ roles: ['ADMIN'] });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Acesso negado: permission insuficiente',
    );
    expect(permissionCacheMock.getFreshPermissions).not.toHaveBeenCalled();
  });
});
