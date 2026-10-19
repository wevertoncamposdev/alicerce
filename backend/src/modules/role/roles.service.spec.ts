import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleRepository } from './persistence/role.repository';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

const prismaMock = {
  role: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  permission: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  rolePermission: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  userRole: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const roleRepositoryMock = {
  search: jest.fn(),
  count: jest.fn(),
};

const permissionCacheMock = {
  invalidateUser: jest.fn(),
  invalidateUsers: jest.fn(),
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Default: nenhum usuário afetado, a menos que um teste sobrescreva com
    // `.mockResolvedValueOnce` — evita que todo teste que passa por
    // attachPermission/detachPermission/remove precise mockar isto só para
    // não quebrar no `.map()` da invalidação de cache.
    prismaMock.userRole.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RoleRepository, useValue: roleRepositoryMock },
        { provide: PermissionCacheService, useValue: permissionCacheMock },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('attachPermission: should upsert permission when role and permission exist', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 't1',
      deletedAt: null,
    });
    prismaMock.permission.findUnique.mockResolvedValueOnce({
      id: 'perm-1',
      tenantId: 't1',
      deletedAt: null,
    });
    prismaMock.rolePermission.upsert.mockResolvedValueOnce({ id: 'rp-1' });

    const res = await service.attachPermission(
      'role-1',
      't1',
      'perm-1',
      'res-a',
    );

    expect(prismaMock.role.findUnique).toHaveBeenCalledWith({
      where: { id: 'role-1' },
    });
    expect(prismaMock.permission.findUnique).toHaveBeenCalledWith({
      where: { id: 'perm-1' },
    });
    expect(prismaMock.rolePermission.upsert).toHaveBeenCalled();
    expect(res).toEqual({ id: 'rp-1' });
  });

  it('attachPermission: should throw NotFoundException when permission missing', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 't1',
      deletedAt: null,
    });
    prismaMock.permission.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.attachPermission('role-1', 't1', 'perm-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('attachUser: should upsert userRole when role and user exist', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 't1',
      deletedAt: null,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      tenantId: 't1',
      deletedAt: null,
    });
    prismaMock.userRole.upsert.mockResolvedValueOnce({ id: 'ur-1' });

    const res = await service.attachUser('role-1', 't1', 'user-1');

    expect(prismaMock.role.findUnique).toHaveBeenCalledWith({
      where: { id: 'role-1' },
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
    expect(prismaMock.userRole.upsert).toHaveBeenCalled();
    expect(res).toEqual({ id: 'ur-1' });
  });

  it('attachUser: should throw NotFoundException when user missing', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 't1',
      deletedAt: null,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.attachUser('role-1', 't1', 'user-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create: should enforce tenantId from the current tenant context instead of the body payload', async () => {
    prismaMock.role.create.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 'tenant-1',
    });

    await service.create(
      { name: 'Admin', type: 'ADMIN', description: 'Admin role' },
      'tenant-1',
    );

    expect(prismaMock.role.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Admin',
        type: 'ADMIN',
        description: 'Admin role',
        status: 'ACTIVE',
      },
    });
  });

  it('search: should include tenantId in where clause to prevent cross-tenant queries', async () => {
    roleRepositoryMock.search.mockResolvedValueOnce([
      { id: 'r1', tenantId: 'tenant-1' },
    ]);
    roleRepositoryMock.count.mockResolvedValueOnce(1);

    await service.search({ searchText: 'admin' }, 'tenant-1');

    expect(roleRepositoryMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        // `expect.any(Array)` é tipado como `any` pelo @types/jest — não
        // tem como tipar isso de forma mais estrita sem reescrever o matcher.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        OR: expect.any(Array),
      }),
      0,
      20,
      undefined,
    );
  });

  it('findOne: should return the role when it belongs to the requesting tenant', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 'tenant-1',
      deletedAt: null,
    });

    const result = await service.findOne('role-1', 'tenant-1');

    expect(result).toEqual({
      id: 'role-1',
      tenantId: 'tenant-1',
      deletedAt: null,
    });
  });

  it('findOne: should throw NotFoundException when the role belongs to another tenant', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 'tenant-2',
      deletedAt: null,
    });

    await expect(service.findOne('role-1', 'tenant-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update: should throw NotFoundException when the role belongs to another tenant', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 'tenant-2',
      deletedAt: null,
    });

    await expect(
      service.update('role-1', { name: 'Hacked' }, 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.role.update).not.toHaveBeenCalled();
  });

  it('remove: should throw NotFoundException when the role belongs to another tenant', async () => {
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 'role-1',
      tenantId: 'tenant-2',
      deletedAt: null,
    });

    await expect(service.remove('role-1', 'tenant-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findUsersOfRole: should include detailed user fields required by the detail UI', async () => {
    prismaMock.userRole.findMany.mockResolvedValueOnce([
      {
        user: {
          id: 'u-1',
          email: 'user@example.com',
          tenantId: 'tenant-1',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]);

    const result = await service.findUsersOfRole('role-1', 'tenant-1');

    expect(prismaMock.userRole.findMany).toHaveBeenCalledWith({
      where: { roleId: 'role-1', tenantId: 'tenant-1' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tenantId: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    expect(result[0].user.email).toBe('user@example.com');
  });

  it('findPermissionsOfRole: should include detailed permission fields required by the detail UI', async () => {
    prismaMock.rolePermission.findMany.mockResolvedValueOnce([
      {
        permission: {
          id: 'p-1',
          name: 'read:users',
          type: 'READ',
          resource: 'users',
          description: 'Read users',
          tenantId: 'tenant-1',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]);

    const result = await service.findPermissionsOfRole('role-1', 'tenant-1');

    expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
      where: { roleId: 'role-1', tenantId: 'tenant-1' },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            type: true,
            resource: true,
            description: true,
            tenantId: true,
            createdAt: true,
          },
        },
      },
    });
    expect(result[0].permission.name).toBe('read:users');
  });

  // P7.5: invalidação do cache de permissões. attachUser/detachUser afetam
  // só 1 usuário; attachPermission/detachPermission/remove afetam todo
  // mundo que tem a role (ver RolesService.invalidatePermissionCacheForRole).
  describe('permission cache invalidation', () => {
    it('attachUser: invalidates only the attached user', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        deletedAt: null,
      });
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        tenantId: 't1',
        deletedAt: null,
      });
      prismaMock.userRole.upsert.mockResolvedValueOnce({ id: 'ur-1' });

      await service.attachUser('role-1', 't1', 'user-1');

      expect(permissionCacheMock.invalidateUser).toHaveBeenCalledWith(
        't1',
        'user-1',
      );
    });

    it('detachUser: invalidates only the detached user', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        type: 'USER',
        deletedAt: null,
      });
      prismaMock.userRole.deleteMany.mockResolvedValueOnce({ count: 1 });

      await service.detachUser('role-1', 't1', 'user-1');

      expect(permissionCacheMock.invalidateUser).toHaveBeenCalledWith(
        't1',
        'user-1',
      );
    });

    it('attachPermission: invalidates every user who holds the role', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        deletedAt: null,
      });
      prismaMock.permission.findUnique.mockResolvedValueOnce({
        id: 'perm-1',
        tenantId: 't1',
        deletedAt: null,
      });
      prismaMock.rolePermission.upsert.mockResolvedValueOnce({ id: 'rp-1' });
      prismaMock.userRole.findMany.mockResolvedValueOnce([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      await service.attachPermission('role-1', 't1', 'perm-1');

      expect(permissionCacheMock.invalidateUsers).toHaveBeenCalledWith('t1', [
        'user-1',
        'user-2',
      ]);
    });

    it('detachPermission: invalidates every user who holds the role', async () => {
      prismaMock.rolePermission.deleteMany.mockResolvedValueOnce({
        count: 1,
      });
      prismaMock.userRole.findMany.mockResolvedValueOnce([
        { userId: 'user-3' },
      ]);

      await service.detachPermission('role-1', 't1', 'perm-1');

      expect(permissionCacheMock.invalidateUsers).toHaveBeenCalledWith('t1', [
        'user-3',
      ]);
    });

    it('remove: invalidates every user who held the deactivated role', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        deletedAt: null,
      });
      prismaMock.role.update.mockResolvedValueOnce({ id: 'role-1' });
      prismaMock.userRole.findMany.mockResolvedValueOnce([
        { userId: 'user-4' },
      ]);

      await service.remove('role-1', 't1');

      expect(permissionCacheMock.invalidateUsers).toHaveBeenCalledWith('t1', [
        'user-4',
      ]);
    });
  });

  // C4: o tenant nunca pode ficar sem admin, nem um admin remover a própria
  // role ADMIN (ver FECHAMENTO.md e RolesService.hasOtherActiveAdmin).
  // Desde o ADR 0007 (etapa 3.4), o gatilho é `isSystem`, não mais
  // `type === 'ADMIN'` — `type` continua no fixture só como metadado.
  describe('admin lockout protection (C4)', () => {
    it('detachUser: blocks a user from removing their own admin access, even with other admins around', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        type: 'ADMIN',
        isSystem: true,
        deletedAt: null,
      });

      await expect(
        service.detachUser('role-1', 't1', 'user-1', 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.userRole.deleteMany).not.toHaveBeenCalled();
    });

    it('detachUser: blocks removing the last active admin of the tenant', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        type: 'ADMIN',
        isSystem: true,
        deletedAt: null,
      });
      prismaMock.userRole.count.mockResolvedValueOnce(0);

      await expect(
        service.detachUser('role-1', 't1', 'user-1', 'current-admin'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.userRole.deleteMany).not.toHaveBeenCalled();
    });

    it('detachUser: allows removing an admin role when another active admin remains', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        type: 'ADMIN',
        isSystem: true,
        deletedAt: null,
      });
      prismaMock.userRole.count.mockResolvedValueOnce(1);
      prismaMock.userRole.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.detachUser(
        'role-1',
        't1',
        'user-1',
        'current-admin',
      );

      expect(result).toEqual({ removed: true });
    });

    it('remove: blocks deleting a system role, unconditionally (409)', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        type: 'ADMIN',
        isSystem: true,
        deletedAt: null,
      });

      await expect(service.remove('role-1', 't1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prismaMock.role.update).not.toHaveBeenCalled();
    });

    it('remove: allows deleting a non-system role', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-2',
        tenantId: 't1',
        type: 'USER',
        isSystem: false,
        deletedAt: null,
      });
      prismaMock.role.update.mockResolvedValueOnce({ id: 'role-2' });

      const result = await service.remove('role-2', 't1');

      expect(result).toEqual({ id: 'role-2' });
    });
  });

  describe('update: system role rename protection (ADR 0007)', () => {
    it('blocks renaming a system role', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        name: 'ADMIN',
        type: 'ADMIN',
        isSystem: true,
        deletedAt: null,
      });

      await expect(
        service.update('role-1', { name: 'Not Admin Anymore' }, 't1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.role.update).not.toHaveBeenCalled();
    });

    it('allows updating other fields of a system role as long as the name is unchanged', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-1',
        tenantId: 't1',
        name: 'ADMIN',
        type: 'ADMIN',
        isSystem: true,
        deletedAt: null,
      });
      prismaMock.role.update.mockResolvedValueOnce({ id: 'role-1' });

      const result = await service.update(
        'role-1',
        { name: 'ADMIN', description: 'novo texto' },
        't1',
      );

      expect(result).toEqual({ id: 'role-1' });
    });

    it('allows renaming a non-system role', async () => {
      prismaMock.role.findUnique.mockResolvedValueOnce({
        id: 'role-2',
        tenantId: 't1',
        name: 'Coordenador',
        type: 'USER',
        isSystem: false,
        deletedAt: null,
      });
      prismaMock.role.update.mockResolvedValueOnce({ id: 'role-2' });

      const result = await service.update(
        'role-2',
        { name: 'Coordenador Regional' },
        't1',
      );

      expect(result).toEqual({ id: 'role-2' });
    });
  });
});
