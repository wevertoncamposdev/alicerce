import * as path from 'path';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
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
import { UsersModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';
import { FilesService } from '@core/files/file.service';
import { MailService } from '@core/mail/mail.service';

interface MockPermissionRow {
  id: string;
  name: string;
}

interface MockRoleRow {
  id: string;
  permissions: { permission: MockPermissionRow }[];
}

interface MockTenantRow {
  id: string;
  legalName: string;
  tradeName: string | null;
  logoFileId: string | null;
  slug: string;
  status: string;
  deletedAt: null;
}

interface MockUserRow {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  password: string | null;
  invitedAt: Date | null;
  status: string;
  deletedAt: null;
  createdAt: Date;
  tenant: MockTenantRow;
  roles: { role: MockRoleRow }[];
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

/**
 * Cobre o aceite da etapa 7.4 (Plano Base.md): convite → aceite → login
 * com os papéis certos. Papéis são atribuídos escrevendo direto no mock
 * (simula o RelationShell/UserRolesHost que já existe no frontend — não
 * precisa re-testar aquele endpoint aqui, só que o login final devolve as
 * permissões certas).
 *
 * `users`/`tokens` são compartilhados entre o mock de `PrismaService`
 * (usado por UsersService/AccountTokenService.issue — rota autenticada,
 * contexto de tenant já resolvido) e o mock de `PrismaBootstrapService`
 * (usado por AuthService.acceptInvite/signIn — a mesma tabela física,
 * só um "papel" de conexão diferente, ver tenant-rls.extension.ts).
 */
describe('Convite de usuário: convite -> aceite -> login (e2e)', () => {
  let app: NestFastifyApplication;
  let jwtService: JwtService;
  let users: Map<string, MockUserRow>;
  let tokens: Map<string, MockTokenRow>;
  let sendMock: jest.Mock;

  const adminTenantId = randomUUID();
  const adminUserId = randomUUID();
  const tenant: MockTenantRow = {
    id: adminTenantId,
    legalName: 'Instituicao Teste',
    tradeName: null,
    logoFileId: null,
    slug: 'instituicao-teste',
    status: 'ACTIVE',
    deletedAt: null,
  };

  beforeAll(async () => {
    users = new Map();
    tokens = new Map();
    sendMock = jest.fn().mockResolvedValue(undefined);

    const prismaMock = {
      user: {
        create: ({
          data,
        }: {
          data: {
            email: string;
            name?: string;
            password: string | null;
            invitedAt: Date;
            tenant: { connect: { id: string } };
          };
        }) => {
          const row: MockUserRow = {
            id: randomUUID(),
            tenantId: data.tenant.connect.id,
            email: data.email,
            name: data.name ?? null,
            password: data.password,
            invitedAt: data.invitedAt,
            status: 'ACTIVE',
            deletedAt: null,
            createdAt: new Date(),
            tenant,
            roles: [],
          };
          users.set(row.id, row);
          return Promise.resolve(row);
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
        updateMany: ({
          where,
          data,
        }: {
          where: { userId: string; type: string; usedAt: null };
          data: { usedAt: Date };
        }) => {
          let count = 0;
          for (const row of tokens.values()) {
            if (
              row.userId === where.userId &&
              row.type === where.type &&
              row.usedAt === null
            ) {
              row.usedAt = data.usedAt;
              count += 1;
            }
          }
          return Promise.resolve({ count });
        },
      },
    };

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
      refreshToken: {
        create: () => Promise.resolve(undefined),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        AuthorizationModule,
        AuthModule,
        UsersModule,
        RoleModule,
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
      .useValue({
        getFreshPermissions: jest.fn().mockResolvedValue(['user.create']),
        setPermissions: () => Promise.resolve(undefined),
        invalidateUser: () => Promise.resolve(undefined),
      })
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

  function extractTokenFromEmail(): string {
    const call = sendMock.mock.calls.at(-1) as [{ text: string }];
    const match = call[0].text.match(/token=([a-f0-9]+)/);
    if (!match) throw new Error('Token não encontrado no corpo do e-mail');
    return match[1];
  }

  it('convida, assume que os papéis já foram atribuídos, aceita e faz login com as permissões certas', async () => {
    const adminToken = await jwtService.signAsync({
      sub: adminUserId,
      username: 'admin@example.com',
      tenantId: adminTenantId,
      permissions: ['user.create'],
    });

    const inviteResponse = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'convidado@example.com', name: 'Pessoa Convidada' })
      .expect(201);

    const inviteBody = inviteResponse.body as {
      id: string;
      pendingInvite: boolean;
    };
    expect(inviteBody.pendingInvite).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const invitedUserId = inviteBody.id;
    // Simula a atribuição de papel via o host de relação que já existe no
    // frontend (UserRolesHost) — não é o que este teste cobre.
    const invitedUser = users.get(invitedUserId)!;
    invitedUser.roles = [
      {
        role: {
          id: randomUUID(),
          permissions: [
            { permission: { id: randomUUID(), name: 'feedback.read' } },
          ],
        },
      },
    ];

    const rawInviteToken = extractTokenFromEmail();

    await request(app.getHttpServer())
      .post('/auth/accept-invite')
      .send({ token: rawInviteToken, password: 'uma-senha-bem-forte-123' })
      .expect(200);

    expect(invitedUser.password).not.toBeNull();
    expect(
      await bcrypt.compare('uma-senha-bem-forte-123', invitedUser.password!),
    ).toBe(true);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'convidado@example.com',
        password: 'uma-senha-bem-forte-123',
      })
      .expect(200);

    const loginBody = loginResponse.body as {
      user: { permissions: string[] };
    };
    expect(loginBody.user.permissions).toEqual(['feedback.read']);
  });

  it('login falha com a senha certa antes do convite ser aceito', async () => {
    const adminToken = await jwtService.signAsync({
      sub: adminUserId,
      username: 'admin@example.com',
      tenantId: adminTenantId,
      permissions: ['user.create'],
    });

    await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'ainda-nao-aceitou@example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ainda-nao-aceitou@example.com',
        password: 'qualquer-coisa',
      })
      .expect(401);
  });
});
