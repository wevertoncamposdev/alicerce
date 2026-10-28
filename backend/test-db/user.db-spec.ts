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
