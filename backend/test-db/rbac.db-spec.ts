import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, inviteAndAccept, login, Session } from './helpers/flows';

/**
 * Modelo de acesso (Fase 3, ADR 0007): permissões vêm do catálogo, papéis
 * são pacotes de permissões por tenant, rotas checam só `@Permissions` —
 * nunca `@Roles`. Contra Postgres real pra confirmar que a checagem lê o
 * estado atual do papel a cada requisição, não algo cacheado no JWT.
 *
 * Os dois cenários abaixo concedem permissão via `PUT /roles/:id/permissions`
 * (`replacePermissions`, substitui o conjunto inteiro). O antigo
 * `POST /roles/:id/permissions` (`attachPermission`) tinha um bug de upsert
 * no Prisma 7.10 (`resource: null` rejeitado numa chave composta) e não
 * tinha consumidor nenhum — removido na etapa F2.1
 * (`docs/Plan-Finalizacao.md`) em vez de corrigido.
 */
describe('RBAC — permissões por papel (Postgres real)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  async function permissionIdByName(admin: Session, name: string): Promise<string> {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/permissions')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const list = res.body.items ?? res.body;
    const permission = list.find((p: { name: string }) => p.name === name);
    if (!permission) throw new Error(`Permissão "${name}" não encontrada no catálogo.`);
    return permission.id;
  }

  it('papel só com feedback.read lê feedbacks e leva 403 em /roles', async () => {
    const admin = await registerTenant(testApp.app);

    const roleRes = await request(testApp.app.getHttpServer())
      .post('/api/roles')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Coordenador', type: 'USER' })
      .expect(201);
    const roleId = roleRes.body.id;

    const feedbackReadId = await permissionIdByName(admin, 'feedback.read');
    await request(testApp.app.getHttpServer())
      .put(`/api/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ permissionIds: [feedbackReadId] })
      .expect(200);

    let coordenador = await inviteAndAccept(testApp.app, testApp.mail, admin);

    await request(testApp.app.getHttpServer())
      .post(`/api/roles/${roleId}/users`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ tenantId: admin.tenantId, userId: coordenador.userId })
      .expect(201);

    // Permissões efetivas não vêm no JWT (etapa 3.6) — relogar garante que
    // a sessão usada no teste reflete o papel recém-atribuído.
    coordenador = await login(testApp.app, coordenador.email, 'SenhaForte123');

    await request(testApp.app.getHttpServer())
      .search('/api/feedbacks')
      .set('Authorization', `Bearer ${coordenador.accessToken}`)
      .send({})
      .expect(200);

    await request(testApp.app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${coordenador.accessToken}`)
      .expect(403);
  });

  it('conceder role.read ao papel vale sem novo login (checagem não é cacheada no JWT)', async () => {
    const admin = await registerTenant(testApp.app);

    const roleRes = await request(testApp.app.getHttpServer())
      .post('/api/roles')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Coordenador', type: 'USER' })
      .expect(201);
    const roleId = roleRes.body.id;

    let coordenador = await inviteAndAccept(testApp.app, testApp.mail, admin);
    await request(testApp.app.getHttpServer())
      .post(`/api/roles/${roleId}/users`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ tenantId: admin.tenantId, userId: coordenador.userId })
      .expect(201);
    coordenador = await login(testApp.app, coordenador.email, 'SenhaForte123');

    const roleReadId = await permissionIdByName(admin, 'role.read');
    await request(testApp.app.getHttpServer())
      .put(`/api/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ permissionIds: [roleReadId] })
      .expect(200);

    // Mesmo accessToken de antes da concessão — sem relogar.
    await request(testApp.app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${coordenador.accessToken}`)
      .expect(200);
  });
});
