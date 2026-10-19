import * as path from 'path';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';

/**
 * Cobre a etapa 1.6 do Plano Base.md: 5 falhas de login em 15min bloqueiam
 * o e-mail, mesmo com a senha certa na 6ª tentativa. `RedisService` é
 * substituído por um stub em memória (Map) — o mesmo papel que o Redis real
 * cumpre aqui (contador por e-mail + TTL), sem precisar de infra externa.
 */
class InMemoryRedisClient {
  private readonly store = new Map<
    string,
    { value: number; expiresAt?: number }
  >();

  get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return Promise.resolve(null);
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(String(entry.value));
  }

  incr(key: string): Promise<number> {
    const current = this.store.get(key);
    const next = (current?.value ?? 0) + 1;
    this.store.set(key, { value: next, expiresAt: current?.expiresAt });
    return Promise.resolve(next);
  }

  expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return Promise.resolve(0);
    entry.expiresAt = Date.now() + seconds * 1000;
    return Promise.resolve(1);
  }

  del(key: string): Promise<number> {
    return Promise.resolve(this.store.delete(key) ? 1 : 0);
  }
}

describe('Bloqueio por conta após falhas repetidas (e2e)', () => {
  let app: INestApplication<App>;

  const email = 'locked-out@example.com';
  const correctPassword = 'correct-password';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(correctPassword, 4);

    const user = {
      id: randomUUID(),
      email,
      password: passwordHash,
      tenantId: randomUUID(),
      status: 'ACTIVE',
      deletedAt: null,
      roles: [],
      tenant: {
        id: randomUUID(),
        legalName: 'Tenant 1',
        slug: 'tenant-1',
        status: 'ACTIVE',
        deletedAt: null,
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
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
      .useValue({
        user: { findUnique: () => Promise.resolve(user) },
        refreshToken: {
          create: () => Promise.resolve({}),
        },
      })
      .overrideProvider(RedisService)
      .useValue({ client: new InMemoryRedisClient() })
      .overrideProvider(PermissionCacheService)
      .useValue({ setPermissions: () => Promise.resolve(undefined) })
      .overrideProvider(AuditService)
      .useValue({ register: () => Promise.resolve(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloqueia a 6ª tentativa mesmo com a senha certa, após 5 falhas', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: correctPassword })
      .expect(401);
  });
});
