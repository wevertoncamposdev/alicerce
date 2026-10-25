import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant } from './helpers/flows';

const PASSWORD = 'SenhaForte123';

/**
 * I3 (docs/PLAN-fase-12.md): sem `@NormalizeEmail()` (ainda não existe),
 * `Fulano@x.com` e `fulano@x.com` são contas diferentes pro Postgres —
 * cadastro duplicado com outra caixa não é bloqueado, e login com outra
 * caixa falha. Corrige na etapa 12.9. Os dois cenários são `it.failing`.
 */
describe('E-mail sem normalização de caixa (Postgres real)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it.failing('cadastro com e-mail em maiúsculas de uma conta existente → 409', async () => {
    const user = await registerTenant(testApp.app, { password: PASSWORD });

    await request(testApp.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        tenantName: 'Outro Tenant',
        tenantSlug: `outro-${Date.now()}`,
        email: user.email.toUpperCase(),
        password: PASSWORD,
        acceptedTerms: true,
      })
      .expect(409);
  });

  it.failing('login com outra caixa do e-mail cadastrado funciona', async () => {
    const user = await registerTenant(testApp.app, { password: PASSWORD });

    await request(testApp.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email.toUpperCase(), password: PASSWORD })
      .expect(200);
  });
});
