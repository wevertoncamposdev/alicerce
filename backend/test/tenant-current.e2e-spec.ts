import * as path from 'path';
import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { App } from 'supertest/types';
import { TenantModule } from '@modules/tenant/tenant.module';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { RedisModule } from '@core/redis/redis.module';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { FilesService } from '@core/files/file.service';

interface MockTenantRow {
  id: string;
  legalName: string;
  slug: string;
  tradeName?: string | null;
}

/**
 * Cobre a etapa 5.2 do Plano Base.md: `GET/PATCH /tenant/current` resolve
 * o próprio tenant do token (`@TenantId()`), sem `:id` na URL — não há como
 * um admin apontar pra outro tenant por essa rota. Mock de PrismaService
 * em memória (mesmo padrão de user-tenant-isolation.e2e-spec.ts).
 */
class MockPrismaService {
  tenants = new Map<string, MockTenantRow>();

  tenant = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.tenants.get(id) ?? null),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Partial<MockTenantRow>;
    }) => {
      const existing = this.tenants.get(id);
      if (!existing) return Promise.reject(new Error('not found'));
      Object.assign(existing, data);
      return Promise.resolve(existing);
    },
  };
}

describe('GET/PATCH /tenant/current (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let mockPrisma: MockPrismaService;

  const tenantId = randomUUID();
  const otherTenantId = randomUUID();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        AuthorizationModule,
        AuthModule,
        TenantModule,
        I18nModule.forRoot({
          fallbackLanguage: 'pt',
          loaderOptions: { path: path.join(__dirname, '../src/i18n/') },
        }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(new MockPrismaService())
      .overrideProvider(PermissionCacheService)
      .useValue({
        getFreshPermissions: jest
          .fn()
          .mockImplementation((_tenantId: string, userId: string) => {
            const permissionsByUser: Record<string, string[]> = {
              'admin-1': ['tenant.read', 'tenant.update'],
              'readonly-user': ['tenant.read'],
              'no-permissions-user': [],
            };
            return Promise.resolve(permissionsByUser[userId] ?? []);
          }),
      })
      .overrideProvider(FilesService)
      .useValue({
        getSignedUrlOrNull: () => Promise.resolve(null),
        assertUploadedBy: () => Promise.resolve(undefined),
      })
      .compile();

    mockPrisma = moduleFixture.get<MockPrismaService>(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockPrisma.tenants.clear();
    mockPrisma.tenants.set(tenantId, {
      id: tenantId,
      legalName: 'Instituição Original',
      slug: 'instituicao-original',
    });
    mockPrisma.tenants.set(otherTenantId, {
      id: otherTenantId,
      legalName: 'Outra Instituição',
      slug: 'outra-instituicao',
    });
  });

  async function tokenFor(sub: string, forTenantId: string) {
    return jwtService.signAsync({
      sub,
      username: 'admin@example.com',
      tenantId: forTenantId,
      permissions: ['tenant.read', 'tenant.update'],
    });
  }

  it('GET /tenant/current retorna 401 sem token', async () => {
    await request(app.getHttpServer()).get('/tenant/current').expect(401);
  });

  it('GET /tenant/current retorna o próprio tenant do token', async () => {
    const token = await tokenFor('admin-1', tenantId);

    const res = await request(app.getHttpServer())
      .get('/tenant/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: tenantId,
      legalName: 'Instituição Original',
    });
  });

  it('GET /tenant/current retorna 403 sem tenant.read', async () => {
    const token = await jwtService.signAsync({
      sub: 'no-permissions-user',
      username: 'sem-permissao@example.com',
      tenantId,
      permissions: [],
    });

    await request(app.getHttpServer())
      .get('/tenant/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('PATCH /tenant/current atualiza o próprio tenant', async () => {
    const token = await tokenFor('admin-1', tenantId);

    const res = await request(app.getHttpServer())
      .patch('/tenant/current')
      .set('Authorization', `Bearer ${token}`)
      .send({ tradeName: 'Nome Fantasia' })
      .expect(200);

    expect(res.body).toMatchObject({ tradeName: 'Nome Fantasia' });
  });

  it('PATCH /tenant/current rejeita slug no body (imutável — nem whitelisted)', async () => {
    const token = await tokenFor('admin-1', tenantId);

    await request(app.getHttpServer())
      .patch('/tenant/current')
      .set('Authorization', `Bearer ${token}`)
      .send({ tradeName: 'Nome Fantasia', slug: 'tentativa-de-mudar-o-slug' })
      .expect(400);

    expect(mockPrisma.tenants.get(tenantId)?.slug).toBe('instituicao-original');
  });

  it('PATCH /tenant/current retorna 403 sem tenant.update', async () => {
    const token = await jwtService.signAsync({
      sub: 'readonly-user',
      username: 'leitura@example.com',
      tenantId,
      permissions: ['tenant.read'],
    });

    await request(app.getHttpServer())
      .patch('/tenant/current')
      .set('Authorization', `Bearer ${token}`)
      .send({ tradeName: 'Não deveria aplicar' })
      .expect(403);
  });

  it('não há como um admin ler o tenant de outra pessoa via /tenant/current', async () => {
    const token = await tokenFor('admin-1', tenantId);

    const res = await request(app.getHttpServer())
      .get('/tenant/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as { id: string };
    expect(body.id).toBe(tenantId);
    expect(body.id).not.toBe(otherTenantId);
  });
});
