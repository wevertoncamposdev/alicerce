import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

const prismaMock = {
  permission: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  rolePermission: { findMany: jest.fn() },
  userRole: { findMany: jest.fn() },
};

const permissionCacheMock = {
  invalidateUsers: jest.fn(),
};

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.rolePermission.findMany.mockResolvedValue([]);
    prismaMock.userRole.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PermissionCacheService, useValue: permissionCacheMock },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  // P7.5: mudar/remover uma permissão afeta todo mundo que tem qualquer role
  // que carregue essa permissão — fan-out permission → roles → usuários.
  describe('permission cache invalidation', () => {
    it('update: invalidates every user reachable through a role holding this permission', async () => {
      prismaMock.permission.findUnique.mockResolvedValueOnce({
        id: 'perm-1',
        tenantId: 't1',
        deletedAt: null,
      });
      prismaMock.permission.update.mockResolvedValueOnce({ id: 'perm-1' });
      prismaMock.rolePermission.findMany.mockResolvedValueOnce([
        { roleId: 'role-1' },
        { roleId: 'role-2' },
      ]);
      prismaMock.userRole.findMany.mockResolvedValueOnce([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      await service.update('perm-1', { name: 'user.read.renamed' }, 't1');

      expect(prismaMock.userRole.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', roleId: { in: ['role-1', 'role-2'] } },
        select: { userId: true },
      });
      expect(permissionCacheMock.invalidateUsers).toHaveBeenCalledWith('t1', [
        'user-1',
        'user-2',
      ]);
    });

    it('remove: invalidates affected users before soft-deleting', async () => {
      prismaMock.permission.findUnique.mockResolvedValueOnce({
        id: 'perm-1',
        tenantId: 't1',
        deletedAt: null,
      });
      prismaMock.rolePermission.findMany.mockResolvedValueOnce([
        { roleId: 'role-1' },
      ]);
      prismaMock.userRole.findMany.mockResolvedValueOnce([
        { userId: 'user-3' },
      ]);
      prismaMock.permission.update.mockResolvedValueOnce({ id: 'perm-1' });

      await service.remove('perm-1', 't1');

      expect(permissionCacheMock.invalidateUsers).toHaveBeenCalledWith('t1', [
        'user-3',
      ]);
    });

    it('update: throws NotFoundException without touching the cache when the permission does not exist', async () => {
      prismaMock.permission.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('missing', { name: 'x' }, 't1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(permissionCacheMock.invalidateUsers).not.toHaveBeenCalled();
    });
  });
});
