import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleRepository } from './persistence/role.repository';
import { PrismaService } from '@core/prisma/prisma.service';

const prismaMock: any = {
    role: { findUnique: jest.fn() },
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
});
