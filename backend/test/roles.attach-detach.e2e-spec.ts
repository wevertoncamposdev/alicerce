import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RoleModule } from '@modules/role/role.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';

class MockPrisma {
    roles = new Map<string, any>();
    users = new Map<string, any>();
    permissions = new Map<string, any>();
    userRoles: any[] = [];
    rolePermissions: any[] = [];

    constructor() {
        // seed minimal data
        this.roles.set('role-1', { id: 'role-1', tenantId: 'tenant-1', deletedAt: null });
        this.users.set('user-1', { id: 'user-1', deletedAt: null });
        this.permissions.set('perm-1', { id: 'perm-1', tenantId: 'tenant-1', deletedAt: null });
    }

    role = {
        findUnique: async ({ where: { id } }: any) => this.roles.get(id) ?? null,
    };

    user = {
        findUnique: async ({ where: { id } }: any) => this.users.get(id) ?? null,
    };

    permission = {
        findUnique: async ({ where: { id } }: any) => this.permissions.get(id) ?? null,
    };

    userRole = {
        upsert: async ({ where, create, update }: any) => {
            const existing = this.userRoles.find((r) => r.userId === where.userId_roleId.userId && r.roleId === where.userId_roleId.roleId);
            if (existing) {
                Object.assign(existing, update);
                return existing;
            }
            const created = { ...create };
            this.userRoles.push(created);
            return created;
        },
        deleteMany: async ({ where }: any) => {
            const before = this.userRoles.length;
            this.userRoles = this.userRoles.filter((r) => !(r.userId === where.userId && r.roleId === where.roleId && r.tenantId === where.tenantId));
            return { count: before - this.userRoles.length };
        },
        findMany: async ({ where }: any) => this.userRoles.filter((r) => r.roleId === where.roleId && r.tenantId === where.tenantId),
    };

    rolePermission = {
        upsert: async ({ where, create }: any) => {
            const key = where.roleId_permissionId_resource;
            const existing = this.rolePermissions.find((p) => p.roleId === key.roleId && p.permissionId === key.permissionId && p.resource === key.resource);
            if (existing) return existing;
            const created = { ...create };
            this.rolePermissions.push(created);
            return created;
        },
        deleteMany: async ({ where }: any) => {
            const before = this.rolePermissions.length;
            this.rolePermissions = this.rolePermissions.filter((p) => !(p.permissionId === where.permissionId && p.roleId === where.roleId && p.tenantId === where.tenantId));
            return { count: before - this.rolePermissions.length };
        },
        findMany: async ({ where }: any) => this.rolePermissions.filter((p) => p.roleId === where.roleId && p.tenantId === where.tenantId),
    };
}

describe('Roles attach/detach (e2e with mocked Prisma)', () => {
    let app: INestApplication;
    let mockPrisma: MockPrisma;

    beforeAll(async () => {
        mockPrisma = new MockPrisma();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [RoleModule],
        })
            .overrideProvider(PrismaService)
            .useValue(mockPrisma as unknown as PrismaService)
            .overrideGuard(RolesPermissionsGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('attaches a user to a role', async () => {
        const res = await request(app.getHttpServer())
            .post('/roles/role-1/users')
            .send({ tenantId: 'tenant-1', userId: 'user-1' })
            .expect(201);

        expect(res.body).toMatchObject({ tenantId: 'tenant-1', userId: 'user-1', roleId: 'role-1' });
    });

    it('detaches a user from a role', async () => {
        // ensure a relation exists
        await mockPrisma.userRole.upsert({ where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } }, create: { tenantId: 'tenant-1', userId: 'user-1', roleId: 'role-1' }, update: {} });

        const res = await request(app.getHttpServer())
            .delete('/roles/role-1/users/user-1')
            .query({ tenantId: 'tenant-1' })
            .expect(200);

        expect(res.body).toEqual({ removed: true });
    });

    it('attaches a permission to a role', async () => {
        const res = await request(app.getHttpServer())
            .post('/roles/role-1/permissions')
            .send({ tenantId: 'tenant-1', permissionId: 'perm-1' })
            .expect(201);

        expect(res.body).toMatchObject({ tenantId: 'tenant-1', roleId: 'role-1', permissionId: 'perm-1' });
    });

    it('detaches a permission from a role', async () => {
        await mockPrisma.rolePermission.upsert({ where: { roleId_permissionId_resource: { roleId: 'role-1', permissionId: 'perm-1', resource: null } }, create: { tenantId: 'tenant-1', roleId: 'role-1', permissionId: 'perm-1', resource: null }, update: {} });

        const res = await request(app.getHttpServer())
            .delete('/roles/role-1/permissions/perm-1')
            .query({ tenantId: 'tenant-1' })
            .expect(200);

        expect(res.body).toEqual({ removed: true });
    });
});
