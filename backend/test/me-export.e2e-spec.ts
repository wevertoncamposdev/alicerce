import * as path from 'path';
import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cookiePlugin from '@fastify/cookie';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { FilesService } from '@core/files/file.service';

interface MockUserRow {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  theme: string | null;
  locale: string | null;
  avatarFileId: string | null;
}

interface MockRefreshTokenRow {
  userId: string;
  familyId: string;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  expiresAt: Date;
}

interface MockConsentRow {
  userId: string;
  document: string;
  version: string;
  acceptedAt: Date;
  ip: string | null;
}

interface MockAuditRow {
  tenantId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  type: string;
  createdAt: Date;
}

/**
 * Cobre a etapa 9.2 (Plano Base.md, LGPD): `GET /me/export` devolve
 * perfil, sessões, consentimentos e atividade de auditoria — só do próprio
 * usuário. Mock de PrismaService cobrindo os quatro modelos que
 * MeService.exportMyData/AuditService.findAllByUserId consultam.
 */
describe('Exportar meus dados (e2e)', () => {
  let app: NestFastifyApplication;
  let jwtService: JwtService;
  let users: Map<string, MockUserRow>;
  let refreshTokens: MockRefreshTokenRow[];
  let consents: MockConsentRow[];
  let audits: MockAuditRow[];

  const tenantId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();

  beforeAll(async () => {
    users = new Map();
    refreshTokens = [];
    consents = [];
    audits = [];

    const prismaMock = {
      user: {
        findUnique: ({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(users.get(id) ?? null),
      },
      refreshToken: {
        findMany: ({ where }: { where: { userId: string } }) =>
          Promise.resolve(
            refreshTokens.filter((t) => t.userId === where.userId),
          ),
      },
      consentRecord: {
        findMany: ({ where }: { where: { userId: string } }) =>
          Promise.resolve(consents.filter((c) => c.userId === where.userId)),
      },
      audit: {
        findMany: ({
          where,
        }: {
          where: { tenantId: string; userId: string };
        }) =>
          Promise.resolve(
            audits.filter(
              (a) => a.tenantId === where.tenantId && a.userId === where.userId,
            ),
          ),
      },
    };

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
      .useValue(prismaMock)
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
      .overrideProvider(FilesService)
      .useValue({ getSignedUrlOrNull: () => Promise.resolve(null) })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookiePlugin);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    users.clear();
    refreshTokens.length = 0;
    consents.length = 0;
    audits.length = 0;

    users.set(userId, {
      id: userId,
      tenantId,
      email: 'pessoa@example.com',
      name: 'Pessoa de Teste',
      theme: null,
      locale: null,
      avatarFileId: null,
    });
    users.set(otherUserId, {
      id: otherUserId,
      tenantId,
      email: 'outra-pessoa@example.com',
      name: 'Outra Pessoa',
      theme: null,
      locale: null,
      avatarFileId: null,
    });

    refreshTokens.push({
      userId,
      familyId: randomUUID(),
      userAgent: 'TestAgent/1.0',
      ip: '127.0.0.1',
      lastUsedAt: new Date(),
      createdAt: new Date(),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    refreshTokens.push({
      userId: otherUserId,
      familyId: randomUUID(),
      userAgent: 'OutroAgent/1.0',
      ip: '10.0.0.1',
      lastUsedAt: new Date(),
      createdAt: new Date(),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    consents.push({
      userId,
      document: 'terms',
      version: '2026-10-24',
      acceptedAt: new Date(),
      ip: '127.0.0.1',
    });
    consents.push({
      userId: otherUserId,
      document: 'terms',
      version: '2026-10-24',
      acceptedAt: new Date(),
      ip: '10.0.0.1',
    });

    audits.push({
      tenantId,
      userId,
      action: 'PATCH',
      entity: 'user',
      entityId: userId,
      type: 'DATA_CHANGE',
      createdAt: new Date(),
    });
    audits.push({
      tenantId,
      userId: otherUserId,
      action: 'PATCH',
      entity: 'user',
      entityId: otherUserId,
      type: 'DATA_CHANGE',
      createdAt: new Date(),
    });
  });

  async function signUserToken(id: string, email: string): Promise<string> {
    return jwtService.signAsync({
      sub: id,
      username: email,
      tenantId,
      permissions: [],
    });
  }

  it('devolve perfil, sessões, consentimentos e atividade só do usuário autenticado', async () => {
    const accessToken = await signUserToken(userId, 'pessoa@example.com');

    const res = await request(app.getHttpServer())
      .get('/me/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as {
      profile: { id: string; email: string };
      sessions: { ip: string | null }[];
      consents: { ip: string | null }[];
      activity: { entityId: string | null }[];
    };

    expect(body.profile.id).toBe(userId);
    expect(body.profile.email).toBe('pessoa@example.com');

    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].ip).toBe('127.0.0.1');

    expect(body.consents).toHaveLength(1);
    expect(body.consents[0].ip).toBe('127.0.0.1');

    expect(body.activity).toHaveLength(1);
    expect(body.activity[0].entityId).toBe(userId);
  });
});
