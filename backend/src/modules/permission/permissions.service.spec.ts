import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '@core/prisma/prisma.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  const prismaMock = {
    permission: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  describe('findAll', () => {
    it('flattens the role relation into a plain roles[] (no N+1 per row)', async () => {
      prismaMock.permission.findMany.mockResolvedValueOnce([
        {
          id: 'perm-1',
          name: 'user.read',
          resource: 'users',
          roles: [
            { role: { id: 'role-1', name: 'ADMIN' } },
            { role: { id: 'role-2', name: 'VIEWER' } },
          ],
        },
      ] as never);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual([
        {
          id: 'perm-1',
          name: 'user.read',
          resource: 'users',
          roles: [
            { id: 'role-1', name: 'ADMIN' },
            { id: 'role-2', name: 'VIEWER' },
          ],
        },
      ]);
      expect(prismaMock.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            roles: { select: { role: { select: { id: true, name: true } } } },
          },
        }),
      );
    });

    it('dedupes a role that grants the same permission via more than one RolePermission row', async () => {
      // Chave composta de RolePermission inclui `resource` — dados antigos
      // com `resource` custom podem coexistir com a concessão de catálogo
      // (resource: null) pro mesmo papel+permissão.
      prismaMock.permission.findMany.mockResolvedValueOnce([
        {
          id: 'perm-1',
          name: 'audit.read',
          resource: 'audit',
          roles: [
            { role: { id: 'role-1', name: 'ADMIN' } },
            { role: { id: 'role-1', name: 'ADMIN' } },
            { role: { id: 'role-1', name: 'ADMIN' } },
          ],
        },
      ] as never);

      const result = await service.findAll('tenant-1');

      expect(result[0].roles).toEqual([{ id: 'role-1', name: 'ADMIN' }]);
    });
  });

  describe('findRolesOfPermission', () => {
    it('dedupes a role that grants the same permission via more than one RolePermission row', async () => {
      prismaMock.rolePermission.findMany.mockResolvedValueOnce([
        { role: { id: 'role-1', name: 'ADMIN', type: 'ADMIN' } },
        { role: { id: 'role-1', name: 'ADMIN', type: 'ADMIN' } },
      ] as never);

      const result = await service.findRolesOfPermission('perm-1', 'tenant-1');

      expect(result).toEqual([{ id: 'role-1', name: 'ADMIN', type: 'ADMIN' }]);
    });
  });

  describe('search', () => {
    it('flattens the role relation for every item', async () => {
      prismaMock.permission.findMany.mockResolvedValueOnce([
        { id: 'perm-1', name: 'role.assign', resource: 'roles', roles: [] },
      ] as never);
      prismaMock.permission.count.mockResolvedValueOnce(1);

      const result = await service.search({}, 'tenant-1');

      expect(result.items).toEqual([
        { id: 'perm-1', name: 'role.assign', resource: 'roles', roles: [] },
      ]);
      expect(result.total).toBe(1);
    });
  });
});
