import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, Session } from './helpers/flows';

/**
 * Limpeza prevista na etapa 12.10/F4.3: rotas `:id` sem `ParseUUIDPipe`
 * deixavam um valor não-UUID cair direto no Prisma, que lançava um erro
 * não tratado (500) em vez de uma validação de entrada (400). Corrigido
 * aplicando `ParseUUIDPipe` em todo `:id`/`:userId`/`:familyId`/`:feedbackId`
 * de rota que chega a uma consulta Prisma.
 */
describe('Validação de parâmetros de rota (Postgres real)', () => {
  let testApp: TestApp;
  let admin: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('GET /roles/nao-e-uuid → 400', async () => {
    await request(testApp.app.getHttpServer())
      .get('/api/roles/nao-e-uuid')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(400);
  });
});
