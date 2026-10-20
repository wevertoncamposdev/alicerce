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
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';
import { FilesService } from '@core/files/file.service';
import { MailService } from '@core/mail/mail.service';

interface MockUserRow {
  id: string;
  tenantId: string;
  email: string;
  password: string;
  status: string;
  deletedAt: null;
}

interface MockTenantRow {
  id: string;
  legalName: string;
  tradeName: string | null;
  logoFileId: string | null;
}

interface MockTokenRow {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  tokenHash: string;
  newEmail: string | null;
  expiresAt: Date;
  usedAt: Date | null;
}

/**
 * Cobre a etapa 7.6 (Plano Base.md): o e-mail só muda depois da
 * confirmação — POST /me/email emite o token e manda os dois avisos;
 * POST /auth/confirm-email-change aplica a troca de fato. `users`/
 * `tokens` compartilhados entre o mock de PrismaService (POST /me/email
 * — rota autenticada, tenant já resolvido) e o de PrismaBootstrapService
 * (POST /auth/confirm-email-change — rota @Public()), mesma tabela
 * física, só "papéis" de conexão diferentes.
 */
describe('Troca de e-mail no perfil (e2e)', () => {
  let app: NestFastifyApplication;
  let jwtService: JwtService;
  let users: Map<string, MockUserRow>;
  let tokens: Map<string, MockTokenRow>;
  let sendMock: jest.Mock;

  const tenantId = randomUUID();
  const userId = randomUUID();
  const tenant: MockTenantRow = {
    id: tenantId,
    legalName: 'Instituicao Teste',
    tradeName: null,
    logoFileId: null,
  };

  beforeAll(async () => {
    users = new Map();
    tokens = new Map();
    sendMock = jest.fn().mockResolvedValue(undefined);

    const prismaMock = {
      user: {
        findUnique: ({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email !== undefined) {
            const found = [...users.values()].find(
              (u) => u.email === where.email,
            );
            return Promise.resolve(found ?? null);
          }
          return Promise.resolve(users.get(where.id ?? '') ?? null);
        },
      },
      tenant: {
        findUnique: ({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(id === tenant.id ? tenant : null),
      },
      accountToken: {
        create: ({ data }: { data: Omit<MockTokenRow, 'id' | 'usedAt'> }) => {
          const row: MockTokenRow = {
            id: randomUUID(),
            usedAt: null,
            ...data,
          };
          tokens.set(row.tokenHash, row);
          return Promise.resolve(row);
        },
      },
    };

    const prismaBootstrapMock = {
      user: {
        update: ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Partial<MockUserRow>;
        }) => {
          const user = users.get(id);
          if (!user) return Promise.reject(new Error('not found'));
          if (
            data.email &&
            [...users.values()].some(
              (u) => u.id !== id && u.email === data.email,
            )
          ) {
            return Promise.reject(
              Object.assign(new Error('unique violation'), { code: 'P2002' }),
            );
          }
          Object.assign(user, data);
          return Promise.resolve(user);
        },
      },
      accountToken: {
        findUnique: ({
          where: { tokenHash },
        }: {
          where: { tokenHash: string };
        }) => Promise.resolve(tokens.get(tokenHash) ?? null),
        update: ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Partial<MockTokenRow>;
        }) => {
          const row = [...tokens.values()].find((t) => t.id === id);
          if (!row) return Promise.reject(new Error('not found'));
          Object.assign(row, data);
          return Promise.resolve(row);
        },
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
      .overrideProvider(PrismaBootstrapService)
      .useValue(prismaBootstrapMock)
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
      .useValue({ getSignedUrlOrNull: () => Promise.resolve(null) })
      .overrideProvider(MailService)
      .useValue({ send: sendMock })
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
    sendMock.mockClear();
    users.clear();
    users.set(userId, {
      id: userId,
      tenantId,
      email: 'antigo@example.com',
      password: 'hashed-password',
      status: 'ACTIVE',
      deletedAt: null,
    });
  });

  function extractTokenFromEmail(callIndex: number): string {
    const call = sendMock.mock.calls[callIndex] as [{ text: string }];
    const match = call[0].text.match(/token=([a-f0-9]+)/);
    if (!match) throw new Error('Token não encontrado no corpo do e-mail');
    return match[1];
  }

  async function signUserToken(): Promise<string> {
    return jwtService.signAsync({
      sub: userId,
      username: 'antigo@example.com',
      tenantId,
      permissions: [],
    });
  }

  it('o e-mail só muda depois da confirmação; GET /me mostra o antigo até lá', async () => {
    const accessToken = await signUserToken();

    await request(app.getHttpServer())
      .post('/me/email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newEmail: 'novo@example.com' })
      .expect(204);

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'novo@example.com' }),
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'antigo@example.com' }),
    );

    const meBeforeConfirm = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((meBeforeConfirm.body as { email: string }).email).toBe(
      'antigo@example.com',
    );

    const rawToken = extractTokenFromEmail(0);

    await request(app.getHttpServer())
      .post('/auth/confirm-email-change')
      .send({ token: rawToken })
      .expect(200);

    expect(users.get(userId)!.email).toBe('novo@example.com');

    const meAfterConfirm = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((meAfterConfirm.body as { email: string }).email).toBe(
      'novo@example.com',
    );
  });

  it('POST /me/email rejeita um e-mail já em uso por outra conta', async () => {
    users.set(randomUUID(), {
      id: randomUUID(),
      tenantId,
      email: 'ocupado@example.com',
      password: 'hashed-password',
      status: 'ACTIVE',
      deletedAt: null,
    });
    const accessToken = await signUserToken();

    await request(app.getHttpServer())
      .post('/me/email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newEmail: 'ocupado@example.com' })
      .expect(409);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('usar o mesmo token de confirmação duas vezes falha na segunda', async () => {
    const accessToken = await signUserToken();

    await request(app.getHttpServer())
      .post('/me/email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newEmail: 'novo2@example.com' })
      .expect(204);

    const rawToken = extractTokenFromEmail(0);

    await request(app.getHttpServer())
      .post('/auth/confirm-email-change')
      .send({ token: rawToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/confirm-email-change')
      .send({ token: rawToken })
      .expect(400);
  });
});
