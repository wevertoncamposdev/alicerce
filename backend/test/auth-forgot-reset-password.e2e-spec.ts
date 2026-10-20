import * as path from 'path';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
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
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PrismaService } from '@core/prisma/prisma.service';
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
  name: string | null;
  password: string;
  status: string;
  deletedAt: null;
  tenant: {
    id: string;
    legalName: string;
    tradeName: string | null;
    logoFileId: string | null;
    slug: string;
    status: string;
    deletedAt: null;
  };
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

describe('Esqueci / redefinir senha (e2e)', () => {
  let app: NestFastifyApplication;
  let users: Map<string, MockUserRow>;
  let tokens: Map<string, MockTokenRow>;
  let refreshTokenRows: Array<{
    id: string;
    userId: string;
    familyId: string;
    revokedAt: Date | null;
  }>;
  let sendMock: jest.Mock;

  const tenantId = randomUUID();
  const userId = randomUUID();
  const email = 'esqueci-a-senha@example.com';
  const currentPassword = 'senha-atual-bem-forte-123';

  beforeAll(async () => {
    users = new Map();
    tokens = new Map();
    refreshTokenRows = [
      { id: randomUUID(), userId, familyId: randomUUID(), revokedAt: null },
    ];
    sendMock = jest.fn().mockResolvedValue(undefined);

    // AuthService passa `client: this.prismaBootstrap` explicitamente pro
    // AccountTokenService nestes dois fluxos (são rotas @Public(), sem
    // tenant no contexto — ver comentário em account-token.service.ts),
    // então o `accountToken` de verdade mora aqui, não no mock de
    // PrismaService abaixo.
    const prismaBootstrapMock = {
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
        update: ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Partial<MockUserRow>;
        }) => {
          const user = users.get(id);
          if (!user) return Promise.reject(new Error('not found'));
          Object.assign(user, data);
          return Promise.resolve(user);
        },
      },
      refreshToken: {
        updateMany: ({
          where,
          data,
        }: {
          where: { userId: string; revokedAt: null };
          data: { revokedAt: Date };
        }) => {
          let count = 0;
          for (const row of refreshTokenRows) {
            if (row.userId === where.userId && row.revokedAt === null) {
              row.revokedAt = data.revokedAt;
              count += 1;
            }
          }
          return Promise.resolve({ count });
        },
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

    // PrismaService só precisa existir pra satisfazer a injeção do
    // AccountTokenService (ele é @Global()) — forgot/reset-password nunca
    // deveriam chamá-lo de verdade (ver nota acima), então qualquer uso
    // aqui é bug e deve quebrar o teste alto e claro.
    const unexpectedPrismaCall = () =>
      Promise.reject(
        new Error(
          'AccountTokenService usou PrismaService em vez do client explícito (PrismaBootstrapService) — rota @Public() sem tenant no contexto quebraria a RLS de verdade.',
        ),
      );
    const prismaMock = {
      accountToken: {
        create: unexpectedPrismaCall,
        findUnique: unexpectedPrismaCall,
        update: unexpectedPrismaCall,
        updateMany: unexpectedPrismaCall,
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
      .overrideProvider(PrismaBootstrapService)
      .useValue(prismaBootstrapMock)
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    sendMock.mockClear();
    users.clear();
    users.set(userId, {
      id: userId,
      tenantId,
      email,
      name: 'Pessoa Teste',
      password: await bcrypt.hash(currentPassword, 4),
      status: 'ACTIVE',
      deletedAt: null,
      tenant: {
        id: tenantId,
        legalName: 'Instituição Teste',
        tradeName: null,
        logoFileId: null,
        slug: 'instituicao-teste',
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
  });

  function extractTokenFromEmail(): string {
    const call = sendMock.mock.calls[0] as [{ text: string }];
    const match = call[0].text.match(/token=([a-f0-9]+)/);
    if (!match) throw new Error('Token não encontrado no corpo do e-mail');
    return match[1];
  }

  it('fluxo completo: forgot-password manda e-mail, reset-password troca a senha', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(200);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const rawToken = extractTokenFromEmail();
    expect(tokens.get(hashToken(rawToken))).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'uma-senha-nova-bem-forte-456' })
      .expect(200);

    const user = users.get(userId)!;
    expect(
      await bcrypt.compare('uma-senha-nova-bem-forte-456', user.password),
    ).toBe(true);
    expect(refreshTokenRows.every((row) => row.revokedAt !== null)).toBe(true);
  });

  it('usar o mesmo token de reset duas vezes falha na segunda', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(200);

    const rawToken = extractTokenFromEmail();

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'primeira-troca-bem-forte-1' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'segunda-troca-bem-forte-2' })
      .expect(400);
  });

  it('forgot-password devolve a mesma resposta pra e-mail inexistente, sem mandar e-mail', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nao-existe@example.com' })
      .expect(200);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('reset-password com token inválido retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: 'token-que-nao-existe',
        newPassword: 'uma-senha-bem-forte-789',
      })
      .expect(400);
  });
});
