import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersModule } from '@modules/user/user.module';
import { FeedbacksModule } from '@modules/feedbacks/feedbacks.module';
import { RoleModule } from '@modules/role/role.module';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { RedisModule } from '@core/redis/redis.module';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

/**
 * Cobre a etapa 3.2 do Plano Base.md: `@Roles(...)` saiu de todos os
 * controllers — `RolesPermissionsGuard` passa a decidir acesso só por
 * `@Permissions`. Antes desta etapa, este teste falhava: mesmo com as
 * permissões certas, um usuário sem a role `ADMIN`/`USER` no JWT levava 403
 * do bloco de `@Roles` do guard, que rodava *antes* do bloco de permissões.
 *
 * "Coordenador" aqui é só um papel com `roles: []` no JWT (nenhuma role
 * reconhecida) e as permissões `feedback.read`+`user.read` via
 * `PermissionCacheService` — não precisa existir de verdade no banco, já
 * que a checagem de permissão é mockada (mesmo padrão de
 * tenant-create-restricted.e2e-spec.ts). Os handlers reais só são
 * alcançados nos casos de sucesso (200), por isso `PrismaService` é um stub
 * mínimo cobrindo só o que `GET /user` e `GET /feedbacks/:id` tocam.
 */
describe('Rotas checam só permissões, não mais roles (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const feedbackId = 'fb-1';
  const tenantId = 'tenant-1';

  beforeAll(async () => {
    const prismaStub = {
      user: { findMany: jest.fn().mockResolvedValue([]) },
      feedback: {
        findUnique: jest.fn().mockResolvedValue({
          id: feedbackId,
          tenantId,
          title: 'Feedback de teste',
          description: 'Descrição',
          status: 'RECEIVED',
          createdById: 'user-1',
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        RedisModule,
        AuthorizationModule,
        AuthModule,
        UsersModule,
        FeedbacksModule,
        RoleModule,
        // AuthService (puxado via AuthModule) depende de I18nService.
        I18nModule.forRoot({
          fallbackLanguage: 'pt',
          loaderOptions: { path: path.join(__dirname, '../src/i18n/') },
        }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(PermissionCacheService)
      .useValue({
        getFreshPermissions: jest
          .fn()
          .mockResolvedValue(['feedback.read', 'user.read']),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function tokenForCoordenador(): Promise<string> {
    return jwtService.signAsync({
      sub: 'user-1',
      username: 'coordenador@example.com',
      tenantId,
      roles: [], // nenhuma role reconhecida — só permissões
      permissions: ['feedback.read', 'user.read'],
    });
  }

  it('acessa GET /user com só a permissão user.read (sem nenhuma role)', async () => {
    const token = await tokenForCoordenador();

    await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
  });

  it('acessa GET /feedbacks/:id com só a permissão feedback.read (sem nenhuma role)', async () => {
    const token = await tokenForCoordenador();

    await request(app.getHttpServer())
      .get(`/feedbacks/${feedbackId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
  });

  it('recebe 403 em GET /roles (sem role.read)', async () => {
    const token = await tokenForCoordenador();

    await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .expect(403);
  });
});
