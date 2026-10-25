import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { PlatformAuthModule } from '@core/platform-auth/platform-auth.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { PrismaService } from '@core/prisma/prisma.service';

/**
 * Cobre o ADR 0012: login de platform user gera um JWT sem `tenantId`,
 * independente do pipeline de auth de tenant (nenhum AuthModule importado
 * aqui), e GET /platform-auth/me só funciona com esse token.
 */
describe('Login de usuário de plataforma (e2e)', () => {
  let app: INestApplication<App>;

  const email = 'owner@alicerce.dev';
  const correctPassword = 'correct-password';
  let passwordHash: string;

  const activeUser = {
    id: randomUUID(),
    email,
    name: 'Dona da Plataforma',
    status: 'ACTIVE',
  };

  const suspendedUser = {
    id: randomUUID(),
    email: 'suspenso@alicerce.dev',
    name: 'Suspenso',
    status: 'INACTIVE',
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(correctPassword, 4);

    type StoredPlatformUser = (typeof activeUser | typeof suspendedUser) & {
      passwordHash: string;
    };

    const usersByEmail = new Map<string, StoredPlatformUser>(
      [activeUser, suspendedUser].map((user) => [
        user.email,
        { ...user, passwordHash },
      ]),
    );
    const usersById = new Map<string, StoredPlatformUser>(
      [activeUser, suspendedUser].map((user) => [
        user.id,
        { ...user, passwordHash },
      ]),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        PlatformAuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        platformUser: {
          findUnique: ({
            where: { id, email },
          }: {
            where: { id?: string; email?: string };
          }) =>
            Promise.resolve(
              (email ? usersByEmail.get(email) : usersById.get(id!)) ?? null,
            ),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  interface LoginResponseBody {
    access_token: string;
    platform_user: { id: string; email: string; name: string };
  }

  it('autentica com credenciais corretas e devolve um token sem tenantId', async () => {
    const response = await request(app.getHttpServer())
      .post('/platform-auth/login')
      .send({ email, password: correctPassword })
      .expect(200);

    const body = response.body as LoginResponseBody;
    expect(body.access_token).toBeDefined();
    expect(body.platform_user).toEqual({
      id: activeUser.id,
      email: activeUser.email,
      name: activeUser.name,
    });

    const payload = JSON.parse(
      Buffer.from(body.access_token.split('.')[1], 'base64').toString(),
    ) as { tenantId?: string; scope: string };
    expect(payload.tenantId).toBeUndefined();
    expect(payload.scope).toBe('platform');
  });

  it('rejeita senha errada com a mesma mensagem de e-mail inexistente', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/platform-auth/login')
      .send({ email, password: 'senha-errada' })
      .expect(401);

    const unknownEmail = await request(app.getHttpServer())
      .post('/platform-auth/login')
      .send({ email: 'nao-existe@alicerce.dev', password: 'qualquer' })
      .expect(401);

    const wrongPasswordBody = wrongPassword.body as { message: string };
    const unknownEmailBody = unknownEmail.body as { message: string };
    expect(wrongPasswordBody.message).toEqual(unknownEmailBody.message);
  });

  it('bloqueia login de platform user inativo mesmo com senha certa', async () => {
    await request(app.getHttpServer())
      .post('/platform-auth/login')
      .send({ email: suspendedUser.email, password: correctPassword })
      .expect(401);
  });

  it('GET /platform-auth/me exige token válido de platform user', async () => {
    const login = await request(app.getHttpServer())
      .post('/platform-auth/login')
      .send({ email, password: correctPassword })
      .expect(200);

    const loginBody = login.body as LoginResponseBody;

    await request(app.getHttpServer())
      .get('/platform-auth/me')
      .set('Authorization', `Bearer ${loginBody.access_token}`)
      .expect(200)
      .expect(
        ({ body }: { body: { id: string; email: string; name: string } }) => {
          expect(body.id).toBe(activeUser.id);
          expect(body.email).toBe(activeUser.email);
          expect(body.name).toBe(activeUser.name);
        },
      );

    await request(app.getHttpServer()).get('/platform-auth/me').expect(401);
  });
});
