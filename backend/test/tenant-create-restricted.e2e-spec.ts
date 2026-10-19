import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { App } from 'supertest/types';
import { TenantModule } from '@modules/tenant/tenant.module';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

/**
 * Cobre a etapa 1.4 do Plano Base.md: `POST /tenant` deixou de ser público
 * (onboarding é só via `/auth/register`, ver AuthService.signUpPublic). A
 * rota continua existindo e autenticada, mas exige a permissão
 * `tenant.create`, que não entra no catálogo nem é concedida a nenhum papel
 * — nem mesmo ao ADMIN de um tenant (ver ADR 0006 e tenant.controller.ts).
 *
 * `PrismaModule` real entra no grafo só para o DI resolver `TenantService`/
 * `AuthService` — nenhum dos dois casos abaixo chega a tocar o banco: o
 * guard rejeita antes do handler rodar.
 */
describe('POST /tenant não é mais público (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthorizationModule,
        AuthModule,
        TenantModule,
        // AuthService (puxado via AuthModule) depende de I18nService.
        I18nModule.forRoot({
          fallbackLanguage: 'pt',
          loaderOptions: { path: path.join(__dirname, '../src/i18n/') },
        }),
      ],
    })
      .overrideProvider(PermissionCacheService)
      .useValue({
        getFreshPermissions: jest
          .fn()
          .mockResolvedValue(['tenant.read', 'tenant.update', 'tenant.manage']),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('retorna 401 sem token', async () => {
    await request(app.getHttpServer())
      .post('/tenant')
      .send({ legalName: 'Novo Tenant', slug: 'novo-tenant' })
      .expect(401);
  });

  it('retorna 403 com token de admin de tenant (sem tenant.create)', async () => {
    const token = await jwtService.signAsync({
      sub: 'user-1',
      username: 'admin@example.com',
      tenantId: 'tenant-1',
      roles: ['ADMIN'],
      permissions: ['tenant.read', 'tenant.update', 'tenant.manage'],
    });

    await request(app.getHttpServer())
      .post('/tenant')
      .set('Authorization', `Bearer ${token}`)
      .send({ legalName: 'Novo Tenant', slug: 'novo-tenant' })
      .expect(403);
  });
});
