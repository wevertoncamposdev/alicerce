import request from 'supertest';
import { Client } from 'pg';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, Session } from './helpers/flows';

/**
 * Isolamento entre tenants contra RLS de verdade (Postgres real) — o
 * `MockPrisma*` dos `*.e2e-spec.ts` atuais não passa por RLS nenhuma, então
 * nunca pegaria uma regressão aqui (etapa 12.1, ADR 0013).
 */
describe('Isolamento entre tenants (Postgres real)', () => {
  let testApp: TestApp;
  let tenantA: Session;
  let tenantB: Session;
  let feedbackIdOfA: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    tenantA = await registerTenant(testApp.app);
    tenantB = await registerTenant(testApp.app);

    const created = await request(testApp.app.getHttpServer())
      .post('/api/feedbacks')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ title: 'Feedback do tenant A' })
      .expect(201);

    feedbackIdOfA = created.body.id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('tenant B não lê, não lista e não altera o feedback do tenant A', async () => {
    await request(testApp.app.getHttpServer())
      .get(`/api/feedbacks/${feedbackIdOfA}`)
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .expect(404);

    // Listagem é o verbo HTTP "SEARCH" (`@Search()` em
    // FeedbacksController, não `@Get()`) — filtro/paginação vão no corpo.
    const list = await request(testApp.app.getHttpServer())
      .search('/api/feedbacks')
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .send({})
      .expect(200);

    const ids = (list.body.items ?? list.body).map((item: { id: string }) => item.id);
    expect(ids).not.toContain(feedbackIdOfA);

    await request(testApp.app.getHttpServer())
      .patch(`/api/feedbacks/${feedbackIdOfA}`)
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .send({ title: 'Tentativa de alteração' })
      .expect(404);
  });

  it('role app_runtime sem app.tenant_id configurado vê 0 linhas (RLS pura)', async () => {
    // Conexão direta como app_runtime (APP_DATABASE_URL), sem passar pelo
    // Nest/Prisma — não há `SET LOCAL app.tenant_id`, então a policy de RLS
    // sozinha precisa bloquear tudo. Prova que o isolamento não depende da
    // aplicação se comportar bem; o banco garante por conta própria.
    const client = new Client({ connectionString: process.env.APP_DATABASE_URL });
    await client.connect();
    try {
      const result = await client.query('SELECT * FROM feedbacks');
      expect(result.rows).toHaveLength(0);
    } finally {
      await client.end();
    }
  });
});
