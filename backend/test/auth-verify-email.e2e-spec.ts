import * as path from 'path';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
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
import { MailService } from '@core/mail/mail.service';

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
  emailVerifiedAt: Date | null;
}

interface MockTokenRow {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Cobre a etapa 7.5 (Plano Base.md): cadastro -> e-mail de verificação no
 * console -> POST /auth/verify-email -> emailVerified passa a true em
 * /auth/profile. Mesmo molde de MockPrismaBootstrapService de
 * auth-register-name.e2e-spec.ts, com accountToken completo (findUnique/
 * update, não só create) pra sustentar o consume() de verifyEmail.
 */
class MockPrismaBootstrapService {
  tenants = new Map<string, MockTenantRow>();
  users = new Map<string, MockUserRow>();
  tokens = new Map<string, MockTokenRow>();

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
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Partial<MockUserRow>;
    }) => {
      const user = this.users.get(id);
      if (!user) return Promise.reject(new Error('not found'));
      Object.assign(user, data);
      return Promise.resolve(user);
    },
  };

  tenant = {
    findFirst: () => Promise.resolve(null),
  };

  refreshToken = {
    create: () => Promise.resolve({}),
  };

  accountToken = {
    create: ({ data }: { data: Omit<MockTokenRow, 'id' | 'usedAt'> }) => {
      const row: MockTokenRow = { id: randomUUID(), usedAt: null, ...data };
      this.tokens.set(row.tokenHash, row);
      return Promise.resolve(row);
    },
    findUnique: ({ where: { tokenHash } }: { where: { tokenHash: string } }) =>
      Promise.resolve(this.tokens.get(tokenHash) ?? null),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Partial<MockTokenRow>;
    }) => {
      const row = [...this.tokens.values()].find((t) => t.id === id);
      if (!row) return Promise.reject(new Error('not found'));
      Object.assign(row, data);
      return Promise.resolve(row);
    },
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
            emailVerifiedAt: null,
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

describe('Verificação de e-mail no cadastro (e2e)', () => {
  let app: NestFastifyApplication;
  let mockPrismaBootstrap: MockPrismaBootstrapService;
  let sendMock: jest.Mock;

  beforeAll(async () => {
    mockPrismaBootstrap = new MockPrismaBootstrapService();
    sendMock = jest.fn().mockResolvedValue(undefined);

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
      .overrideProvider(MailService)
      .useValue({ send: sendMock })
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

  function extractTokenFromEmail(): string {
    const call = sendMock.mock.calls.at(-1) as [{ text: string }];
    const match = call[0].text.match(/token=([a-f0-9]+)/);
    if (!match) throw new Error('Token não encontrado no corpo do e-mail');
    return match[1];
  }

  it('cadastro -> e-mail de verificação -> verify-email -> emailVerified true em /auth/profile', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: 'Instituição Verificação',
        tenantSlug: 'instituicao-verificacao',
        email: 'verificar@example.com',
        name: 'Pessoa Teste',
        password: 'uma-senha-bem-forte-123',
      })
      .expect(201);

    const registerBody = registerResponse.body as {
      access_token: string;
      user: { emailVerified: boolean };
    };
    expect(registerBody.user.emailVerified).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const profileBefore = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${registerBody.access_token}`)
      .expect(200);
    expect(
      (profileBefore.body as { emailVerified: boolean }).emailVerified,
    ).toBe(false);

    const rawToken = extractTokenFromEmail();
    expect(mockPrismaBootstrap.tokens.get(hashToken(rawToken))).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: rawToken })
      .expect(200);

    const profileAfter = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${registerBody.access_token}`)
      .expect(200);
    expect(
      (profileAfter.body as { emailVerified: boolean }).emailVerified,
    ).toBe(true);
  });

  it('usar o mesmo token de verificação duas vezes falha na segunda', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: 'Instituição Verificação 2',
        tenantSlug: 'instituicao-verificacao-2',
        email: 'verificar2@example.com',
        name: 'Pessoa Teste 2',
        password: 'uma-senha-bem-forte-123',
      })
      .expect(201);

    const rawToken = extractTokenFromEmail();

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: rawToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: rawToken })
      .expect(400);
  });
});
