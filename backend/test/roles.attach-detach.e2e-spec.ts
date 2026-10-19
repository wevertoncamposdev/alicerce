import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RequestWithAuth } from '@core/common/types/http.types';
import { RoleModule } from '@modules/role/role.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

interface MockRole {
  id: string;
  tenantId: string;
  deletedAt: Date | null;
}

interface MockUser {
  id: string;
  deletedAt: Date | null;
}

interface MockPermission {
  id: string;
  tenantId: string;
  deletedAt: Date | null;
}

interface MockUserRole {
  tenantId: string;
  userId: string;
  roleId: string;
  assignedAt?: Date;
}

interface MockRolePermission {
  tenantId: string;
  roleId: string;
  permissionId: string;
  resource: string | null;
}

class MockPrisma {
  roles = new Map<string, MockRole>();
  users = new Map<string, MockUser>();
  permissions = new Map<string, MockPermission>();
  userRoles: MockUserRole[] = [];
  rolePermissions: MockRolePermission[] = [];

  constructor() {
    // seed minimal data
    this.roles.set('role-1', {
      id: 'role-1',
      tenantId: 'tenant-1',
      deletedAt: null,
    });
    this.users.set('user-1', { id: 'user-1', deletedAt: null });
    this.permissions.set('perm-1', {
      id: 'perm-1',
      tenantId: 'tenant-1',
      deletedAt: null,
    });
  }

  role = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      this.roles.get(id) ?? null,
  };

  user = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      this.users.get(id) ?? null,
  };

  permission = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      this.permissions.get(id) ?? null,
  };

  userRole = {
    upsert: ({
      where,
      create,
      update,
    }: {
      where: { userId_roleId: { userId: string; roleId: string } };
      create: MockUserRole;
      update: Partial<MockUserRole>;
    }) => {
      const existing = this.userRoles.find(
        (r) =>
          r.userId === where.userId_roleId.userId &&
          r.roleId === where.userId_roleId.roleId,
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const created = { ...create };
      this.userRoles.push(created);
      return created;
    },
    deleteMany: ({
      where,
    }: {
      where: { userId: string; roleId: string; tenantId: string };
    }) => {
      const before = this.userRoles.length;
      this.userRoles = this.userRoles.filter(
        (r) =>
          !(
            r.userId === where.userId &&
            r.roleId === where.roleId &&
            r.tenantId === where.tenantId
          ),
      );
      return { count: before - this.userRoles.length };
    },
    findMany: ({ where }: { where: { roleId: string; tenantId: string } }) =>
      this.userRoles.filter(
        (r) => r.roleId === where.roleId && r.tenantId === where.tenantId,
      ),
  };

  rolePermission = {
    upsert: ({
      where,
      create,
    }: {
      where: {
        roleId_permissionId_resource: {
          roleId: string;
          permissionId: string;
          resource: string | null;
        };
      };
      create: MockRolePermission;
      update: Record<string, never>;
    }) => {
      const key = where.roleId_permissionId_resource;
      const existing = this.rolePermissions.find(
        (p) =>
          p.roleId === key.roleId &&
          p.permissionId === key.permissionId &&
          p.resource === key.resource,
      );
      if (existing) return existing;
      const created = { ...create };
      this.rolePermissions.push(created);
      return created;
    },
    deleteMany: ({
      where,
    }: {
      where: { permissionId: string; roleId: string; tenantId: string };
    }) => {
      const before = this.rolePermissions.length;
      this.rolePermissions = this.rolePermissions.filter(
        (p) =>
          !(
            p.permissionId === where.permissionId &&
            p.roleId === where.roleId &&
            p.tenantId === where.tenantId
          ),
      );
      return { count: before - this.rolePermissions.length };
    },
    findMany: ({ where }: { where: { roleId: string; tenantId: string } }) =>
      this.rolePermissions.filter(
        (p) => p.roleId === where.roleId && p.tenantId === where.tenantId,
      ),
  };
}

describe('Roles attach/detach (e2e with mocked Prisma)', () => {
  let app: INestApplication<App>;
  let mockPrisma: MockPrisma;

  beforeAll(async () => {
    mockPrisma = new MockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      // AuthorizationModule precisa estar no grafo para RolesService (o SUT,
      // não mockado) resolver PermissionCacheService — @Global() só vale
      // para módulos que já fazem parte do grafo compilado, não é implícito
      // num TestingModule isolado como este.
      imports: [RoleModule, AuthorizationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma as unknown as PrismaService)
      // RolesPermissionsGuard é substituído por um stub abaixo, então o
      // PermissionCacheService real nunca é chamado.
      .overrideProvider(PermissionCacheService)
      .useValue({ invalidateUser: jest.fn(), invalidateUsers: jest.fn() })
      // RoleModule (testado isolado, sem AuthModule) não tem nada que povoe
      // request.user — e @TenantId() lê o tenant de lá (nunca do body da
      // requisição, que é o que os testes abaixo mandam em
      // `.send({ tenantId: ... })`), lançando ForbiddenException direto no
      // decorator se `request.user` não existir. RolesPermissionsGuard é o
      // único guard que de fato roda neste módulo isolado — o stub faz dupla
      // função: libera o acesso e povoa request.user, como o AuthGuard real
      // faria a partir do JWT num ambiente completo.
      .overrideGuard(RolesPermissionsGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest<RequestWithAuth>();
          request.user = {
            sub: 'user-1',
            username: 'user-1@example.com',
            tenantId: 'tenant-1',
            permissions: ['role.assign'],
          };
          return true;
        },
      })
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

    expect(res.body).toMatchObject({
      tenantId: 'tenant-1',
      userId: 'user-1',
      roleId: 'role-1',
    });
  });

  it('detaches a user from a role', async () => {
    // ensure a relation exists
    mockPrisma.userRole.upsert({
      where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } },
      create: { tenantId: 'tenant-1', userId: 'user-1', roleId: 'role-1' },
      update: {},
    });

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

    expect(res.body).toMatchObject({
      tenantId: 'tenant-1',
      roleId: 'role-1',
      permissionId: 'perm-1',
    });
  });

  it('detaches a permission from a role', async () => {
    mockPrisma.rolePermission.upsert({
      where: {
        roleId_permissionId_resource: {
          roleId: 'role-1',
          permissionId: 'perm-1',
          resource: null,
        },
      },
      create: {
        tenantId: 'tenant-1',
        roleId: 'role-1',
        permissionId: 'perm-1',
        resource: null,
      },
      update: {},
    });

    const res = await request(app.getHttpServer())
      .delete('/roles/role-1/permissions/perm-1')
      .query({ tenantId: 'tenant-1' })
      .expect(200);

    expect(res.body).toEqual({ removed: true });
  });
});
