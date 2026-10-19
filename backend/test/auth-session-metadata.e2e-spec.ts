import * as path from 'path';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
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

interface StoredRefreshToken {
  id: string;
  token: string;
  userId: string;
  tenantId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent?: string;
  ip?: string;
  lastUsedAt?: Date;
}

/**
 * Cobre a etapa 4.2 do Plano Base.md: todo refresh token criado (no login e
 * em cada rotação via /auth/refresh) grava userAgent/ip/lastUsedAt vindos da
 * requisição. Mock de PrismaBootstrapService em memória (mesmo padrão de
 * auth-account-lockout.e2e-spec.ts) para inspecionar o `data` gravado sem
 * precisar de banco real.
 */
function extractRefreshTokenCookie(
  setCookieHeader: string[] | undefined,
): string {
  const cookie = (setCookieHeader ?? []).find((entry) =>
    entry.startsWith('refresh_token='),
  );
  if (!cookie) {
    throw new Error('Cookie refresh_token não encontrado na resposta');
  }
  return cookie.split(';')[0].split('=')[1];
}

describe('Metadados de sessão no refresh token (e2e)', () => {
  let app: NestFastifyApplication;
  let tokensByHash: Map<string, StoredRefreshToken>;

  const email = 'session-meta@example.com';
  const password = 'correct-password';
  let passwordHash: string;

  const userId = randomUUID();
  const tenantId = randomUUID();

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);

    const user = {
      id: userId,
      email,
      name: null,
      password: passwordHash,
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      roles: [],
      tenant: {
        id: tenantId,
        legalName: 'Tenant Session Meta',
        slug: 'tenant-session-meta',
        status: 'ACTIVE',
        deletedAt: null,
      },
    };

    tokensByHash = new Map();

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
      .useValue({
        user: { findUnique: () => Promise.resolve(user) },
        refreshToken: {
          create: ({ data }: { data: StoredRefreshToken }) => {
            const stored = { ...data, id: randomUUID(), revokedAt: null };
            tokensByHash.set(data.token, stored);
            return Promise.resolve(stored);
          },
          findUnique: ({ where: { token } }: { where: { token: string } }) =>
            Promise.resolve(tokensByHash.get(token) ?? null),
          update: ({
            where: { id },
            data,
          }: {
            where: { id: string };
            data: Partial<StoredRefreshToken>;
          }) => {
            const found = [...tokensByHash.values()].find(
              (row) => row.id === id,
            );
            if (found) Object.assign(found, data);
            return Promise.resolve(found);
          },
          updateMany: () => Promise.resolve({ count: 0 }),
        },
      })
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
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('grava userAgent/ip/lastUsedAt no login e no refresh subsequente', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', 'TestAgent/1.0')
      .send({ email, password })
      .expect(200);

    expect(tokensByHash.size).toBe(1);
    const [loginToken] = [...tokensByHash.values()];
    expect(loginToken.userAgent).toBe('TestAgent/1.0');
    expect(loginToken.ip).toBeTruthy();
    expect(loginToken.lastUsedAt).toBeInstanceOf(Date);

    const rawRefreshToken = extractRefreshTokenCookie(
      loginRes.headers['set-cookie'] as unknown as string[] | undefined,
    );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('User-Agent', 'TestAgent/2.0')
      .set('Cookie', `refresh_token=${rawRefreshToken}`)
      .expect(200);

    expect(tokensByHash.size).toBe(2);
    const refreshedToken = [...tokensByHash.values()].find(
      (row) => row.userAgent === 'TestAgent/2.0',
    );
    expect(refreshedToken).toBeDefined();
    expect(refreshedToken?.familyId).toBe(loginToken.familyId);
    expect(refreshedToken?.ip).toBeTruthy();
    expect(refreshedToken?.lastUsedAt).toBeInstanceOf(Date);
  });
});
