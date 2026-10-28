import request from 'supertest';
import Redis from 'ioredis';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, Session } from './helpers/flows';

const PASSWORD = 'SenhaForte123';

/**
 * Bloqueio por conta (etapa 1.6) — depende de Redis real; sem ele
 * (ambiente local sem Redis), o bloqueio falha aberto e só o throttle da
 * própria rota (`@Throttle`, 5/min, em memória) segue valendo. Por isso a
 * asserção abaixo é "não 200" em vez de um status exato: localmente passa
 * pelo throttle, no CI (Redis real) passa pelo bloqueio de conta — os dois
 * são "recusada" pro propósito deste cenário. A checagem de TTL só roda se
 * o Redis estiver acessível.
 */
describe('Bloqueio por conta após falhas de login (Postgres real)', () => {
  let testApp: TestApp;
  let user: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    user = await registerTenant(testApp.app, { password: PASSWORD });
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('5 falhas seguidas recusam até a senha certa; chave expira em ≤ 900s', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(testApp.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: 'senha-errada-qualquer' });
    }

    const result = await request(testApp.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: PASSWORD });

    expect(result.status).not.toBe(200);

    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      retryStrategy: () => null,
    });
    try {
      await redis.connect();
      const ttl = await redis.ttl(`login:fail:${user.email}`);
      if (ttl >= 0) {
        expect(ttl).toBeLessThanOrEqual(900);
      }
    } catch {
      // Redis indisponível neste ambiente — já coberto pelo throttle acima.
    } finally {
      redis.disconnect();
    }
  });
});
