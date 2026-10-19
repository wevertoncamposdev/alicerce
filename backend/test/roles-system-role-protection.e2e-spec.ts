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
  name: string;
  isSystem: boolean;
  deletedAt: Date | null;
}

/**
 * Cobre a etapa 3.4 do Plano Base.md (ADR 0007): um papel `isSystem: true`
 * (o ADMIN) nunca pode ser excluído nem renomeado — 409, incondicional (não
 * depende mais de "é o último admin"). Mesmo padrão de
 * `roles.attach-detach.e2e-spec.ts`: `RolesPermissionsGuard` é substituído
 * por um stub que só povoa `request.user` e libera (a etapa 3.2 já cobre o
 * comportamento do guard em si).
 */
class MockPrisma {
  roles = new Map<string, MockRole>();

  constructor() {
    this.roles.set('role-admin', {
      id: 'role-admin',
      tenantId: 'tenant-1',
      name: 'ADMIN',
      isSystem: true,
      deletedAt: null,
    });
    this.roles.set('role-coordenador', {
      id: 'role-coordenador',
      tenantId: 'tenant-1',
      name: 'Coordenador',
      isSystem: false,
      deletedAt: null,
    });
  }

  role = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.roles.get(id) ?? null),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const existing = this.roles.get(id);
      if (!existing) {
        return Promise.reject(
          Object.assign(new Error('Record not found'), { code: 'P2025' }),
        );
      }
      Object.assign(existing, data);
      return Promise.resolve(existing);
    },
  };

  userRole = {
    findMany: () => Promise.resolve([]),
  };
}

describe('Papel de sistema não pode ser excluído nem renomeado (e2e)', () => {
  let app: INestApplication<App>;
  let mockPrisma: MockPrisma;

  beforeAll(async () => {
    mockPrisma = new MockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RoleModule, AuthorizationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma as unknown as PrismaService)
      .overrideProvider(PermissionCacheService)
      .useValue({ invalidateUser: jest.fn(), invalidateUsers: jest.fn() })
      .overrideGuard(RolesPermissionsGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest<RequestWithAuth>();
          request.user = {
            sub: 'user-1',
            username: 'admin@example.com',
            tenantId: 'tenant-1',
            roles: [],
            permissions: ['role.delete', 'role.update'],
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

  it('DELETE num papel isSystem retorna 409', async () => {
    await request(app.getHttpServer()).delete('/roles/role-admin').expect(409);

    expect(mockPrisma.roles.get('role-admin')).toMatchObject({
      deletedAt: null,
    });
  });

  it('PATCH renomeando um papel isSystem retorna 409', async () => {
    await request(app.getHttpServer())
      .patch('/roles/role-admin')
      .send({ name: 'Não é mais admin' })
      .expect(409);

    expect(mockPrisma.roles.get('role-admin')).toMatchObject({
      name: 'ADMIN',
    });
  });

  it('DELETE num papel comum (não isSystem) funciona normalmente', async () => {
    await request(app.getHttpServer())
      .delete('/roles/role-coordenador')
      .expect(200);

    expect(mockPrisma.roles.get('role-coordenador')?.deletedAt).not.toBeNull();
  });
});
