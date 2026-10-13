import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersModule } from '@modules/user/user.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';

/**
 * Cobre a Fase 0 do AGENTS.md ("acesso cruzado entre tenants retorna
 * 403/404") para o módulo user, que foi onde o vazamento real foi
 * encontrado: `findAll` lia o tenantId de `@Query('tenantId')` em vez do
 * contexto autenticado, e `findOne`/`update`/`remove` não validavam o
 * tenant do registro contra o tenant de quem fez a requisição.
 *
 * `RolesPermissionsGuard` é substituído por um "sempre permite" porque o
 * que este teste verifica é o isolamento de tenant em si (a camada de
 * serviço), não RBAC — RBAC já tem cobertura própria em
 * `roles-permissions.guard.spec.ts`. O tenant autenticado é simulado via
 * header `x-tenant-id`, que é exatamente o fallback que `@TenantId()` usa
 * quando não há `TenantMiddleware`/JWT no caminho (ver
 * `tenant-id.decorator.ts`).
 */
class MockPrisma {
  users = new Map<string, Record<string, unknown>>();

  user = {
    findMany: ({ where }: { where: { tenantId?: string; deletedAt: null } }) =>
      Promise.resolve(
        [...this.users.values()].filter(
          (u) =>
            u.deletedAt === where.deletedAt &&
            (!where.tenantId || u.tenantId === where.tenantId),
        ),
      ),
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.users.get(id) ?? null),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const existing = this.users.get(id);
      if (!existing) {
        return Promise.reject(
          Object.assign(new Error('Record not found'), { code: 'P2025' }),
        );
      }
      Object.assign(existing, data);
      return Promise.resolve(existing);
    },
  };
}

describe('User tenant isolation (e2e with mocked Prisma)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrisma;

  const tenantOwn = randomUUID();
  const tenantOther = randomUUID();
  const userOwnId = randomUUID();
  const userOtherId = randomUUID();

  beforeAll(async () => {
    mockPrisma = new MockPrisma();
    mockPrisma.users.set(userOwnId, {
      id: userOwnId,
      tenantId: tenantOwn,
      email: 'own@example.com',
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.users.set(userOtherId, {
      id: userOtherId,
      tenantId: tenantOther,
      email: 'victim@example.com',
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
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

  it('GET /user only lists users of the requesting tenant', async () => {
    const res = await request(app.getHttpServer())
      .get('/user')
      .set('x-tenant-id', tenantOwn)
      .expect(200);

    const ids = (res.body as Array<{ id: string }>).map((u) => u.id);
    expect(ids).toContain(userOwnId);
    expect(ids).not.toContain(userOtherId);
  });

  it('GET /user/:id returns 404 for a user that belongs to another tenant', async () => {
    await request(app.getHttpServer())
      .get(`/user/${userOtherId}`)
      .set('x-tenant-id', tenantOwn)
      .expect(404);
  });

  it('GET /user/:id returns 200 for a user that belongs to the requesting tenant', async () => {
    const res = await request(app.getHttpServer())
      .get(`/user/${userOwnId}`)
      .set('x-tenant-id', tenantOwn)
      .expect(200);

    expect(res.body).toMatchObject({ id: userOwnId });
  });

  it('PATCH /user/:id returns 404 and never mutates a user from another tenant', async () => {
    await request(app.getHttpServer())
      .patch(`/user/${userOtherId}`)
      .set('x-tenant-id', tenantOwn)
      .send({ email: 'hijacked@example.com' })
      .expect(404);

    expect(mockPrisma.users.get(userOtherId)).toMatchObject({
      email: 'victim@example.com',
    });
  });

  it('DELETE /user/:id returns 404 and never soft-deletes a user from another tenant', async () => {
    await request(app.getHttpServer())
      .delete(`/user/${userOtherId}`)
      .set('x-tenant-id', tenantOwn)
      .expect(404);

    expect(mockPrisma.users.get(userOtherId)).toMatchObject({
      deletedAt: null,
      status: 'ACTIVE',
    });
  });
});
