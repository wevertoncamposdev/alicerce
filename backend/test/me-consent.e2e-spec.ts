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

interface MockUserRow {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  password: string;
  status: string;
  deletedAt: null;
  emailVerifiedAt: Date | null;
  tenant: {
    id: string;
    legalName: string;
    slug: string;
    status: string;
    deletedAt: null;
  };
  roles: unknown[];
}

interface MockConsentRow {
  id: string;
  tenantId: string;
  userId: string;
  document: string;
  version: string;
  ip?: string | null;
}

/**
 * Cobre a etapa 9.1 (Plano Base.md, LGPD): quando a versão dos termos muda,
 * `GET /auth/profile` passa a devolver `termsAccepted: false` até o usuário
 * aceitar de novo via `POST /me/consent`. `users`/`consents` compartilhados
 * entre o mock de PrismaBootstrapService (`/auth/profile` — cross-tenant,
 * ver AuthService) e o de PrismaService (`/me/consent` — tenant já
 * resolvido), mesmo padrão de me-change-email.e2e-spec.ts.
 */
describe('Aceite dos termos quando a versão muda (e2e)', () => {
  let app: NestFastifyApplication;
  let jwtService: JwtService;
  let users: Map<string, MockUserRow>;
  let consents: Map<string, MockConsentRow>;

  const tenantId = randomUUID();
  const userId = randomUUID();

  beforeAll(async () => {
    users = new Map();
    consents = new Map();

    const prismaBootstrapMock = {
      user: {
        findUnique: ({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(users.get(id) ?? null),
      },
      consentRecord: {
        findFirst: ({
          where,
        }: {
          where: { userId: string; document: string; version: string };
        }) => {
          const found = [...consents.values()].find(
            (c) =>
              c.userId === where.userId &&
              c.document === where.document &&
              c.version === where.version,
          );
          return Promise.resolve(found ?? null);
        },
      },
    };

    const prismaMock = {
      consentRecord: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          const row: MockConsentRow = {
            id: randomUUID(),
            tenantId: data.tenantId as string,
            userId: data.userId as string,
            document: data.document as string,
            version: data.version as string,
            ip: data.ip as string | null,
          };
          consents.set(row.id, row);
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
    consents.clear();
    users.set(userId, {
      id: userId,
      tenantId,
      email: 'pessoa@example.com',
      name: 'Pessoa de Teste',
      password: 'hashed-password',
      status: 'ACTIVE',
      deletedAt: null,
      emailVerifiedAt: new Date(),
      tenant: {
        id: tenantId,
        legalName: 'Instituicao Teste',
        slug: 'instituicao-teste',
        status: 'ACTIVE',
        deletedAt: null,
      },
      roles: [],
    });
    // Versão antiga, simulando um aceite no cadastro antes da versão atual
    // dos termos mudar (CURRENT_TERMS_VERSION em legal-terms.constants.ts).
    consents.set(randomUUID(), {
      id: randomUUID(),
      tenantId,
      userId,
      document: 'terms',
      version: '2000-01-01',
    });
  });

  async function signUserToken(): Promise<string> {
    return jwtService.signAsync({
      sub: userId,
      username: 'pessoa@example.com',
      tenantId,
      permissions: [],
    });
  }

  it('nova versão dos termos -> termsAccepted false -> aceitar -> termsAccepted true', async () => {
    const accessToken = await signUserToken();

    const profileBefore = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (profileBefore.body as { termsAccepted: boolean }).termsAccepted,
    ).toBe(false);

    await request(app.getHttpServer())
      .post('/me/consent')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const profileAfter = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (profileAfter.body as { termsAccepted: boolean }).termsAccepted,
    ).toBe(true);
  });
});
