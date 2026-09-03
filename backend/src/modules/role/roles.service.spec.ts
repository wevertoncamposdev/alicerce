import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleRepository } from './persistence/role.repository';
import { PrismaService } from '@core/prisma/prisma.service';

const prismaMock: any = {
    role: { findUnique: jest.fn(), create: jest.fn() },
    permission: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    rolePermission: { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
    userRole: { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
};

const roleRepositoryMock = {
    search: jest.fn(),
    count: jest.fn(),
};

describe('RolesService', () => {
    let service: RolesService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: RoleRepository, useValue: roleRepositoryMock },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
    });

    it('attachPermission: should upsert permission when role and permission exist', async () => {
        prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'role-1', tenantId: 't1', deletedAt: null });
        prismaMock.permission.findUnique.mockResolvedValueOnce({ id: 'perm-1', tenantId: 't1', deletedAt: null });
        prismaMock.rolePermission.upsert.mockResolvedValueOnce({ id: 'rp-1' });

        const res = await service.attachPermission('role-1', 't1', 'perm-1', 'res-a');

        expect(prismaMock.role.findUnique).toHaveBeenCalledWith({ where: { id: 'role-1' } });
        expect(prismaMock.permission.findUnique).toHaveBeenCalledWith({ where: { id: 'perm-1' } });
        expect(prismaMock.rolePermission.upsert).toHaveBeenCalled();
        expect(res).toEqual({ id: 'rp-1' });
    });

    it('attachPermission: should throw NotFoundException when permission missing', async () => {
        prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'role-1', tenantId: 't1', deletedAt: null });
        prismaMock.permission.findUnique.mockResolvedValueOnce(null);

        await expect(service.attachPermission('role-1', 't1', 'perm-404')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('attachUser: should upsert userRole when role and user exist', async () => {
        prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'role-1', tenantId: 't1', deletedAt: null });
        prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tenantId: 't1', deletedAt: null });
        prismaMock.userRole.upsert.mockResolvedValueOnce({ id: 'ur-1' });

        const res = await service.attachUser('role-1', 't1', 'user-1');

        expect(prismaMock.role.findUnique).toHaveBeenCalledWith({ where: { id: 'role-1' } });
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
        expect(prismaMock.userRole.upsert).toHaveBeenCalled();
        expect(res).toEqual({ id: 'ur-1' });
    });

    it('attachUser: should throw NotFoundException when user missing', async () => {
        prismaMock.role.findUnique.mockResolvedValueOnce({ id: 'role-1', tenantId: 't1', deletedAt: null });
        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        await expect(service.attachUser('role-1', 't1', 'user-404')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('create: should enforce tenantId from the current tenant context instead of the body payload', async () => {
        prismaMock.role.create.mockResolvedValueOnce({ id: 'role-1', tenantId: 'tenant-1' });

        await service.create({ name: 'Admin', type: 'SYSTEM', description: 'Admin role' }, 'tenant-1');

        expect(prismaMock.role.create).toHaveBeenCalledWith({
            data: {
                tenantId: 'tenant-1',
                name: 'Admin',
                type: 'SYSTEM',
                description: 'Admin role',
                status: 'ACTIVE',
            },
        });
    });

    it('search: should include tenantId in where clause to prevent cross-tenant queries', async () => {
        roleRepositoryMock.search.mockResolvedValueOnce([{ id: 'r1', tenantId: 'tenant-1' }]);
        roleRepositoryMock.count.mockResolvedValueOnce(1);

        await service.search({ searchText: 'admin' }, 'tenant-1');

        expect(roleRepositoryMock.search).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'tenant-1',
                OR: expect.any(Array),
            }),
            0,
            20,
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
});
