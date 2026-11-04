import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, inviteAndAccept, Session } from './helpers/flows';

/**
 * D1 (docs/PLAN-fundacao-ux.md): `UpdateUserDto` não declarava `name`; com
 * `whitelist`/`forbidNonWhitelisted` no ValidationPipe global
 * (configure-app.ts), todo PATCH /user/:id que mandasse `name` voltava 400
 * antes de chegar no service — mesmo a coluna já existindo.
 */
describe('Nome do usuário via PATCH /user/:id (Postgres real) — D1', () => {
  let testApp: TestApp;
  let admin: Session;
  let other: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app);
    other = await inviteAndAccept(testApp.app, testApp.mail, admin);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('admin edita o nome de outro usuário e o valor persiste', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/user/${other.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Novo Nome' })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/user/${other.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.name).toBe('Novo Nome');
  });
});

/**
 * U7 (docs/PLAN-fundacao-ux.md): fecha o conjunto mínimo de `User` —
 * preenche campo a campo pelos dois caminhos reais da tela (admin via
 * `/user/:id`, self-service via `/me`) e confirma que tudo persiste.
 */
describe('Campo a campo — User, mínimo da seção 2 (Postgres real) — U7', () => {
  let testApp: TestApp;
  let admin: Session;
  let other: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app);
    other = await inviteAndAccept(testApp.app, testApp.mail, admin);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('admin preenche nome, telefone (com máscara) e status de outro usuário', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/user/${other.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Ana Lima', phone: '(11) 98888-7777', status: 'INACTIVE' })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/user/${other.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.name).toBe('Ana Lima');
    expect(res.body.phone).toBe('11988887777');
    expect(res.body.status).toBe('INACTIVE');
  });

  it('telefone vazio volta a null, nunca string vazia (D2)', async () => {
    await request(testApp.app.getHttpServer())
      .patch(`/api/user/${other.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ phone: '   ' })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get(`/api/user/${other.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.phone).toBeNull();
  });

  it('o próprio usuário preenche nome, telefone, tema e idioma via /me', async () => {
    await request(testApp.app.getHttpServer())
      .patch('/api/me')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ name: 'Ana Lima', phone: '11988887777', theme: 'dark', locale: 'pt-BR' })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(200);

    expect(res.body.name).toBe('Ana Lima');
    expect(res.body.phone).toBe('11988887777');
    expect(res.body.theme).toBe('dark');
    expect(res.body.locale).toBe('pt-BR');
  });
});
