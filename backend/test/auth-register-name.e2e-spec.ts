import * as path from 'path';
import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cookiePlugin from '@fastify/cookie';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';
import { FilesService } from '@core/files/file.service';

interface MockTenantRow {
  id: string;
  legalName: string;
  slug: string;
  status: string;
  deletedAt: null;
}

interface MockUserRow {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  password: string;
  status: string;
  deletedAt: null;
}

/**
 * Mock em memória de PrismaBootstrapService que reproduz só o que
 * `AuthService.signUpPublic` efetivamente chama (ver auth.service.ts):
 * `$transaction` cria tenant → role → permissões do catálogo → vínculo da
 * role com as permissões → o usuário → o vínculo usuário-role; depois
 * `getAuthUserById` busca o usuário completo (com tenant + roles +
 * permissions aninhados) fora da transação.
 */
class MockPrismaBootstrapService {
  tenants = new Map<string, MockTenantRow>();
  users = new Map<string, MockUserRow>();

  user = {
    findUnique: ({
      where,
      include,
    }: {
      where: { email?: string; id?: string };
      include?: unknown;
    }) => {
      if (where.email !== undefined) {
        const found = [...this.users.values()].find(
          (u) => u.email === where.email,
        );
        return Promise.resolve(found ?? null);
      }

      if (where.id !== undefined) {
        const found = this.users.get(where.id);
        if (!found) return Promise.resolve(null);
        if (!include) return Promise.resolve(found);

        return Promise.resolve({
          ...found,
          tenant: this.tenants.get(found.tenantId),
          roles: [],
        });
      }

      return Promise.resolve(null);
    },
  };

  tenant = {
    findFirst: () => Promise.resolve(null),
  };

  refreshToken = {
    create: () => Promise.resolve({}),
  };

  $transaction<T>(
    callback: (tx: {
      tenant: {
        create: (args: {
          data: Record<string, unknown>;
        }) => Promise<MockTenantRow>;
      };
      role: {
        create: (args: {
          data: Record<string, unknown>;
        }) => Promise<{ id: string }>;
      };
      permission: {
        createMany: () => Promise<{ count: number }>;
        findMany: () => Promise<unknown[]>;
      };
      rolePermission: { createMany: () => Promise<{ count: number }> };
      user: {
        create: (args: {
          data: Record<string, unknown>;
        }) => Promise<MockUserRow>;
      };
      userRole: { create: () => Promise<Record<string, never>> };
    }) => Promise<T>,
  ): Promise<T> {
    const tx = {
      tenant: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const row: MockTenantRow = {
            id: randomUUID(),
            legalName: data.legalName as string,
            slug: data.slug as string,
            status: data.status as string,
            deletedAt: null,
          };
          this.tenants.set(row.id, row);
          return Promise.resolve(row);
        },
      },
      role: { create: () => Promise.resolve({ id: randomUUID() }) },
      permission: {
        createMany: () => Promise.resolve({ count: 0 }),
        findMany: () => Promise.resolve([]),
      },
      rolePermission: { createMany: () => Promise.resolve({ count: 0 }) },
      user: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const row: MockUserRow = {
            id: randomUUID(),
            tenantId: data.tenantId as string,
            email: data.email as string,
            name: data.name as string | undefined,
            password: data.password as string,
            status: data.status as string,
            deletedAt: null,
          };
          this.users.set(row.id, row);
          return Promise.resolve(row);
        },
      },
      userRole: { create: () => Promise.resolve({}) },
    };

    return callback(tx);
  }
}

describe('POST /auth/register grava o nome da pessoa (e2e)', () => {
  let app: NestFastifyApplication;
  let mockPrismaBootstrap: MockPrismaBootstrapService;

  beforeAll(async () => {
    mockPrismaBootstrap = new MockPrismaBootstrapService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        RedisModule,
        AuthorizationModule,
        AuthModule,
        I18nModule.forRoot({
          fallbackLanguage: 'pt',
          loaderOptions: { path: path.join(__dirname, '../src/i18n/') },
        }),
      ],
    })
      .overrideProvider(PrismaBootstrapService)
      .useValue(mockPrismaBootstrap)
      .overrideProvider(RedisService)
      .useValue({
        client: {
          get: () => Promise.resolve(null),
          incr: () => Promise.resolve(1),
          expire: () => Promise.resolve(1),
          del: () => Promise.resolve(1),
        },
      })
      .overrideProvider(PermissionCacheService)
      .useValue({ setPermissions: () => Promise.resolve(undefined) })
      .overrideProvider(AuditService)
      .useValue({ register: () => Promise.resolve(undefined) })
      .overrideProvider(FilesService)
      .useValue({
        getSignedUrlOrNull: () => Promise.resolve(null),
        assertUploadedBy: () => Promise.resolve(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookiePlugin);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria o usuário com o nome da pessoa informado no cadastro', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: 'Instituição de Teste',
        tenantSlug: 'instituicao-de-teste',
        email: 'pessoa@example.com',
        name: 'Pessoa de Teste',
        password: 'uma-senha-bem-forte-123',
      })
      .expect(201);

    const body = res.body as { user: { email: string; name: string } };
    expect(body.user).toMatchObject({
      email: 'pessoa@example.com',
      name: 'Pessoa de Teste',
    });

    const createdUser = [...mockPrismaBootstrap.users.values()][0];
    expect(createdUser.name).toBe('Pessoa de Teste');
  });
});
