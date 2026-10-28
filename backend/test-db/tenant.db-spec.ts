import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, Session } from './helpers/flows';

/**
 * D4 (docs/PLAN-fundacao-ux.md): `IsDocumentConstraint` só valida o dígito
 * verificador contra o `documentType` do MESMO payload parcial. Um PATCH que
 * manda só `document` (sem `documentType`) pula a checagem — mesmo que o
 * tenant já tenha um `documentType` salvo, incompatível com o novo valor.
 * Falta validar contra o registro mesclado (existente + payload), não só o
 * DTO isolado.
 */
describe('Validação cruzada documento x tipo (Postgres real) — D4', () => {
  let testApp: TestApp;
  let admin: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('estabelece o tipo CNPJ com um documento válido', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ documentType: 'CNPJ', document: '11222333000181' })
      .expect(200);
  });

  it('rejeita um documento com dígito inválido mesmo sem documentType no mesmo PATCH', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ document: '11111111111111' })
      .expect(400);

    expect(res.body.details.errors[0].field).toBe('document');
  });
});
