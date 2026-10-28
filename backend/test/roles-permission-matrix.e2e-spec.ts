import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RequestWithAuth } from '@core/common/types/http.types';
import { RoleModule } from '@modules/role/role.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';

/**
 * Cobre a etapa 3.5 do Plano Base.md (ADR 0007): `PUT /roles/:id/permissions`
 * substitui o conjunto de permissões do papel em uma transação, e as
 * permissões efetivas de um usuário desse papel (via `PermissionCacheService`
 * de verdade, não mockado — só o Redis é um fake em memória, mesmo padrão de
 * `auth-account-lockout.e2e-spec.ts`) refletem a troca depois da invalidação
 * de cache automática.
 */
class InMemoryRedisClient {
  private readonly store = new Map<string, string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.has(key) ? this.store.get(key)! : null);
  }

  set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return Promise.resolve('OK');
  }

  del(keys: string | string[]): Promise<number> {
    const list = Array.isArray(keys) ? keys : [keys];
    let removed = 0;
    for (const key of list) {
      if (this.store.delete(key)) removed += 1;
    }
    return Promise.resolve(removed);
  }
}

interface MockRolePermission {
  tenantId: string;
  roleId: string;
  permissionId: string;
  resource: string | null;
}

// ParseUUIDPipe (F4.3, docs/Plan-Finalizacao.md) rejeita `:id` que não
// seja um UUID de verdade — só o roleId vai na URL, por isso só ele
// precisa parecer um UUID (permissionId vai no body do PUT, sem pipe).
const ROLE_ID = '11111111-1111-4111-8111-111111111111';

class MockPrisma {
  roles = new Map([
    [
      ROLE_ID,
      {
        id: ROLE_ID,
        tenantId: 'tenant-1',
        name: 'Coordenador',
        isSystem: false,
        deletedAt: null,
      },
    ],
  ]);

  permissions = new Map([
    [
      'perm-read',
      {
        id: 'perm-read',
        tenantId: 'tenant-1',
        name: 'feedback.read',
        type: 'READ',
        resource: 'feedbacks',
        description: 'Consultar feedbacks',
        deletedAt: null,
      },
    ],
    [
      'perm-manage',
      {
        id: 'perm-manage',
        tenantId: 'tenant-1',
        name: 'feedback.manage',
        type: 'WRITE',
        resource: 'feedbacks',
        description: 'Mudar o status de um feedback',
        deletedAt: null,
      },
    ],
  ]);

  rolePermissions: MockRolePermission[] = [
    {
      tenantId: 'tenant-1',
      roleId: ROLE_ID,
      permissionId: 'perm-read',
      resource: null,
    },
  ];

  userRoles = [{ tenantId: 'tenant-1', userId: 'user-1', roleId: ROLE_ID }];

  users = new Map([
    [
      'user-1',
      {
        id: 'user-1',
        email: 'coord@example.com',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    ],
  ]);

  role = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.roles.get(id) ?? null),
  };

  permission = {
    findMany: ({
      where,
    }: {
      where: {
        tenantId: string;
        deletedAt: null;
        id?: { in: string[] };
        name?: { in: string[] };
      };
    }) => {
      let items = [...this.permissions.values()].filter(
        (p) => p.tenantId === where.tenantId && !p.deletedAt,
      );
      if (where.id) items = items.filter((p) => where.id!.in.includes(p.id));
      if (where.name)
        items = items.filter((p) => where.name!.in.includes(p.name));
      // Reflete o `orderBy: [{ resource: 'asc' }, { name: 'asc' }]' que
      // RolesService.getPermissionMatrix pede de verdade ao Postgres.
      items = [...items].sort(
        (a, b) =>
          a.resource.localeCompare(b.resource) || a.name.localeCompare(b.name),
      );
      return Promise.resolve(items);
    },
  };

  rolePermission = {
    findMany: ({
      where,
    }: {
      where: { roleId: string; tenantId: string; resource: null };
    }) =>
      Promise.resolve(
        this.rolePermissions
          .filter(
            (rp) =>
              rp.roleId === where.roleId &&
              rp.tenantId === where.tenantId &&
              rp.resource === where.resource,
          )
          .map((rp) => ({ permissionId: rp.permissionId })),
      ),
    deleteMany: ({
      where,
    }: {
      where: {
        roleId: string;
        tenantId: string;
        resource: null;
        permissionId: { in: string[] };
      };
    }) => {
      const before = this.rolePermissions.length;
      this.rolePermissions = this.rolePermissions.filter(
        (rp) =>
          !(
            rp.roleId === where.roleId &&
            rp.tenantId === where.tenantId &&
            rp.resource === where.resource &&
            where.permissionId.in.includes(rp.permissionId)
          ),
      );
      return Promise.resolve({ count: before - this.rolePermissions.length });
    },
    createMany: ({ data }: { data: MockRolePermission[] }) => {
      this.rolePermissions.push(...data);
      return Promise.resolve({ count: data.length });
    },
  };

  userRole = {
    // Duas formas bem diferentes de chamar: RolesService.findUsersOfRole
    // (include.user) e PermissionCacheService.reloadPermissions
    // (include.role.include.permissions) — distingue pelo shape do include.
    findMany: (args: {
      where: Record<string, unknown>;
      include?: {
        user?: unknown;
        role?: { include?: { permissions?: unknown } };
      };
    }) => {
      if (args.include?.role?.include?.permissions) {
        const where = args.where as { tenantId: string; userId: string };
        const rows = this.userRoles.filter(
          (ur) => ur.tenantId === where.tenantId && ur.userId === where.userId,
        );
        return Promise.resolve(
          rows.map((ur) => ({
            role: {
              ...this.roles.get(ur.roleId)!,
              permissions: this.rolePermissions
                .filter(
                  (rp) =>
                    rp.roleId === ur.roleId && rp.tenantId === ur.tenantId,
                )
                .map((rp) => ({
                  permission: this.permissions.get(rp.permissionId),
                })),
            },
          })),
        );
      }

      const where = args.where as { roleId: string; tenantId: string };
      const rows = this.userRoles.filter(
        (ur) => ur.roleId === where.roleId && ur.tenantId === where.tenantId,
      );
      return Promise.resolve(
        rows.map((ur) => ({
          userId: ur.userId,
          user: this.users.get(ur.userId),
        })),
      );
    },
  };

  $transaction(ops: Promise<unknown>[]) {
    return Promise.all(ops);
  }
}

describe('Matriz de permissões do papel (e2e)', () => {
  let app: INestApplication<App>;
  let mockPrisma: MockPrisma;
  let permissionCache: PermissionCacheService;

  beforeAll(async () => {
    mockPrisma = new MockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RedisModule, RoleModule, AuthorizationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma as unknown as PrismaService)
      .overrideProvider(RedisService)
      .useValue({ client: new InMemoryRedisClient() })
      .overrideGuard(RolesPermissionsGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest<RequestWithAuth>();
          request.user = {
            sub: 'admin-1',
            username: 'admin@example.com',
            tenantId: 'tenant-1',
            permissions: ['role.read', 'role.assign'],
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    permissionCache = moduleFixture.get(PermissionCacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET permission-matrix mostra o catálogo com o que já está marcado', async () => {
    const res = await request(app.getHttpServer())
      .get(`/roles/${ROLE_ID}/permission-matrix`)
      .expect(200);

    expect(res.body).toEqual([
      {
        resource: 'feedbacks',
        permissions: [
          expect.objectContaining({ name: 'feedback.manage', granted: false }),
          expect.objectContaining({ name: 'feedback.read', granted: true }),
        ],
      },
    ]);
  });

  it('PUT troca o conjunto, e as permissões efetivas de um usuário do papel refletem a troca', async () => {
    const before = await permissionCache.getFreshPermissions(
      'tenant-1',
      'user-1',
    );
    expect(before).toEqual(['FEEDBACK.READ']);

    await request(app.getHttpServer())
      .put(`/roles/${ROLE_ID}/permissions`)
      .send({ permissionIds: ['perm-manage'] })
      .expect(200);

    const after = await permissionCache.getFreshPermissions(
      'tenant-1',
      'user-1',
    );
    expect(after).toEqual(['FEEDBACK.MANAGE']);
  });
});
