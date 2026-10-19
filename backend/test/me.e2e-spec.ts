import * as path from 'path';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cookiePlugin from '@fastify/cookie';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';

interface MockUserRow {
  id: string;
  email: string;
  name: string | null;
  theme: string | null;
  locale: string | null;
  password: string;
  tenantId: string;
}

interface MockRefreshTokenRow {
  id: string;
  token: string;
  userId: string;
  familyId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

function pick<T extends object>(
  obj: T,
  select?: Record<string, boolean>,
): Partial<T> {
  if (!select) return obj;
  const result: Partial<T> = {};
  for (const key of Object.keys(select) as Array<keyof T>) {
    if (select[key as string]) result[key] = obj[key];
  }
  return result;
}

/**
 * Mock em memória de PrismaService (tenant-scoped) — MeService usa este
 * client, não PrismaBootstrapService (ver ADR 0008). Reimplementa só o
 * subconjunto de `user`/`refreshToken` que MeService chama.
 */
class MockPrismaService {
  users = new Map<string, MockUserRow>();
  tokens: MockRefreshTokenRow[] = [];

  user = {
    findUnique: ({
      where: { id },
      select,
    }: {
      where: { id: string };
      select?: Record<string, boolean>;
    }) => Promise.resolve(this.find(id, select)),
    update: ({
      where: { id },
      data,
      select,
    }: {
      where: { id: string };
      data: Partial<MockUserRow>;
      select?: Record<string, boolean>;
    }) => {
      const existing = this.users.get(id);
      if (!existing) return Promise.reject(new Error('not found'));
      Object.assign(existing, data);
      return Promise.resolve(pick(existing, select));
    },
  };

  private find(id: string, select?: Record<string, boolean>) {
    const existing = this.users.get(id);
    return existing ? pick(existing, select) : null;
  }

  refreshToken = {
    findUnique: ({ where: { token } }: { where: { token: string } }) =>
      Promise.resolve(this.tokens.find((row) => row.token === token) ?? null),
    findMany: ({
      where,
      orderBy,
    }: {
      where: { userId: string; revokedAt: null; expiresAt: { gt: Date } };
      orderBy?: { createdAt: 'desc' };
    }) => {
      const rows = this.tokens.filter(
        (row) =>
          row.userId === where.userId &&
          row.revokedAt === null &&
          row.expiresAt > where.expiresAt.gt,
      );
      if (orderBy?.createdAt === 'desc') {
        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return Promise.resolve(rows);
    },
    updateMany: ({
      where,
      data,
    }: {
      where: {
        userId: string;
        revokedAt: null;
        familyId?: string | { not: string };
      };
      data: { revokedAt: Date };
    }) => {
      let count = 0;
      for (const row of this.tokens) {
        if (row.userId !== where.userId || row.revokedAt !== null) continue;
        if (where.familyId) {
          if (typeof where.familyId === 'string') {
            if (row.familyId !== where.familyId) continue;
          } else if (row.familyId === where.familyId.not) {
            continue;
          }
        }
        row.revokedAt = data.revokedAt;
        count += 1;
      }
      return Promise.resolve({ count });
    },
  };
}

function hashRawToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

describe('Endpoints /me (e2e)', () => {
  let app: NestFastifyApplication;
  let mockPrisma: MockPrismaService;
  let jwtService: JwtService;
  let accessToken: string;

  const userId = randomUUID();
  const tenantId = randomUUID();
  const email = 'me@example.com';
  const currentPassword = 'correct-password';
  let currentPasswordHash: string;

  const currentRawToken = 'current-session-raw-token';
  const otherRawToken = 'other-session-raw-token';
  const currentFamilyId = randomUUID();
  const otherFamilyId = randomUUID();

  beforeAll(async () => {
    currentPasswordHash = await bcrypt.hash(currentPassword, 4);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        AuthorizationModule,
        AuthModule,
        I18nModule.forRoot({
          fallbackLanguage: 'pt',
          loaderOptions: { path: path.join(__dirname, '../src/i18n/') },
        }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(new MockPrismaService())
      .overrideProvider(PrismaBootstrapService)
      .useValue({
        user: { findUnique: () => Promise.resolve(null) },
        refreshToken: { create: () => Promise.resolve({}) },
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

    mockPrisma = moduleFixture.get<MockPrismaService>(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookiePlugin);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    accessToken = await jwtService.signAsync({
      sub: userId,
      username: email,
      tenantId,
      permissions: [],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockPrisma.users.clear();
    mockPrisma.users.set(userId, {
      id: userId,
      email,
      name: 'Usuário de Teste',
      theme: null,
      locale: null,
      password: currentPasswordHash,
      tenantId,
    });

    const now = new Date();
    const future = new Date(now.getTime() + 60_000);
    mockPrisma.tokens = [
      {
        id: randomUUID(),
        token: hashRawToken(currentRawToken),
        userId,
        familyId: currentFamilyId,
        revokedAt: null,
        expiresAt: future,
        userAgent: 'CurrentAgent/1.0',
        ip: '127.0.0.1',
        lastUsedAt: now,
        createdAt: now,
      },
      {
        id: randomUUID(),
        token: hashRawToken(otherRawToken),
        userId,
        familyId: otherFamilyId,
        revokedAt: null,
        expiresAt: future,
        userAgent: 'OtherAgent/1.0',
        ip: '10.0.0.2',
        lastUsedAt: now,
        createdAt: new Date(now.getTime() - 1000),
      },
    ];
  });

  function authed(method: 'get' | 'post' | 'patch' | 'delete', url: string) {
    return request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${accessToken}`);
  }

  it('GET /me retorna o perfil sem a senha', async () => {
    const res = await authed('get', '/me').expect(200);
    const body = res.body as Record<string, unknown>;

    expect(body).toMatchObject({
      id: userId,
      email,
      name: 'Usuário de Teste',
    });
    expect(body.password).toBeUndefined();
  });

  it('PATCH /me atualiza nome e preferências', async () => {
    const res = await authed('patch', '/me')
      .send({ name: 'Novo Nome', theme: 'dark', locale: 'pt-BR' })
      .expect(200);

    expect(res.body).toMatchObject({
      name: 'Novo Nome',
      theme: 'dark',
      locale: 'pt-BR',
    });
  });

  it('POST /me/password com senha atual errada retorna 400', async () => {
    await authed('post', '/me/password')
      .send({
        currentPassword: 'senha-errada',
        newPassword: 'NovaSenhaForte123',
      })
      .expect(400);

    const user = mockPrisma.users.get(userId)!;
    expect(user.password).toBe(currentPasswordHash);
  });

  it('POST /me/password com senha atual correta troca a senha e revoga outras sessões', async () => {
    await authed('post', '/me/password')
      .set('Cookie', `refresh_token=${currentRawToken}`)
      .send({ currentPassword, newPassword: 'NovaSenhaForte123' })
      .expect(204);

    const user = mockPrisma.users.get(userId)!;
    expect(await bcrypt.compare('NovaSenhaForte123', user.password)).toBe(true);

    const current = mockPrisma.tokens.find(
      (t) => t.familyId === currentFamilyId,
    );
    const other = mockPrisma.tokens.find((t) => t.familyId === otherFamilyId);
    expect(current?.revokedAt).toBeNull();
    expect(other?.revokedAt).not.toBeNull();
  });

  it('GET /me/sessions lista as sessões ativas e marca a atual', async () => {
    const res = await authed('get', '/me/sessions')
      .set('Cookie', `refresh_token=${currentRawToken}`)
      .expect(200);

    const sessions = res.body as Array<{
      familyId: string;
      isCurrent: boolean;
    }>;

    expect(sessions).toHaveLength(2);
    const current = sessions.find((s) => s.familyId === currentFamilyId);
    const other = sessions.find((s) => s.familyId === otherFamilyId);
    expect(current?.isCurrent).toBe(true);
    expect(other?.isCurrent).toBe(false);
  });

  it('DELETE /me/sessions/:familyId revoga só a sessão indicada', async () => {
    await authed('delete', `/me/sessions/${otherFamilyId}`).expect(204);

    const current = mockPrisma.tokens.find(
      (t) => t.familyId === currentFamilyId,
    );
    const other = mockPrisma.tokens.find((t) => t.familyId === otherFamilyId);
    expect(current?.revokedAt).toBeNull();
    expect(other?.revokedAt).not.toBeNull();
  });

  it('DELETE /me/sessions revoga todas as sessões exceto a atual', async () => {
    await authed('delete', '/me/sessions')
      .set('Cookie', `refresh_token=${currentRawToken}`)
      .expect(204);

    const current = mockPrisma.tokens.find(
      (t) => t.familyId === currentFamilyId,
    );
    const other = mockPrisma.tokens.find((t) => t.familyId === otherFamilyId);
    expect(current?.revokedAt).toBeNull();
    expect(other?.revokedAt).not.toBeNull();
  });
});
