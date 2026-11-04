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

/**
 * D3 (docs/PLAN-fundacao-ux.md): o validador de documento só aceita
 * dígitos (CNPJ com máscara é rejeitado) e `addressState` só tinha
 * `MaxLength(2)` — sem lista, qualquer 2 caracteres passava (ex.: "XX")
 * e um nome de UF por extenso falhava sem motivo claro.
 */
describe('Máscaras e UF (Postgres real) — D3', () => {
  let testApp: TestApp;
  let admin: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('aceita CNPJ com máscara, normalizando para só dígitos', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ documentType: 'CNPJ', document: '11.222.333/0001-81' })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.document).toBe('11222333000181');
  });

  it('aceita UF por extenso, normalizando para a sigla', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ addressState: 'São Paulo' })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.addressState).toBe('SP');
  });

  it('rejeita uma sigla de UF que não existe', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ addressState: 'XX' })
      .expect(400);
  });
});

/**
 * U7 (docs/PLAN-fundacao-ux.md): fecha o conjunto mínimo de `Tenant` —
 * preenche todo o resto do formulário (fora documento/UF, já cobertos
 * acima pelo D3/D4) de uma vez e confirma que cada campo persiste.
 */
describe('Campo a campo — Tenant, mínimo da seção 2 (Postgres real) — U7', () => {
  let testApp: TestApp;
  let admin: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('preenche razão social, contato e endereço inteiros numa tacada', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        legalName: 'Associação Maravilhosa Ltda',
        tradeName: 'Associação Maravilhosa',
        email: 'contato@associacao.example',
        phone: '(11) 3333-4444',
        website: 'https://associacao.example',
        addressStreet: 'Rua das Flores',
        addressNumber: '123',
        addressComplement: 'Sala 4',
        addressNeighborhood: 'Centro',
        addressCity: 'São Paulo',
        addressZipCode: '01000-000',
      })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/tenant/${admin.tenantId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.legalName).toBe('Associação Maravilhosa Ltda');
    expect(res.body.tradeName).toBe('Associação Maravilhosa');
    expect(res.body.email).toBe('contato@associacao.example');
    expect(res.body.phone).toBe('1133334444');
    expect(res.body.website).toBe('https://associacao.example');
    expect(res.body.addressStreet).toBe('Rua das Flores');
    expect(res.body.addressNumber).toBe('123');
    expect(res.body.addressComplement).toBe('Sala 4');
    expect(res.body.addressNeighborhood).toBe('Centro');
    expect(res.body.addressCity).toBe('São Paulo');
    expect(res.body.addressZipCode).toBe('01000000');
  });
});
