import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, Session } from './helpers/flows';

/**
 * U6 (docs/PLAN-fundacao-ux.md, ADR 0014): Notas e Tags são polimórficas
 * (`entity`/`entityId`, sem FK) e tenant-scoped via RLS, igual `Audit`/
 * `File`. Cobre isolamento entre tenants (mesmo padrão de
 * `isolation.db-spec.ts`/`files.db-spec.ts`) e a permissão dinâmica nova
 * (`core/authorization/record-permission.util.ts`): `entity` sem entrada
 * no catálogo nega acesso (ao contrário de `core/files`, que libera).
 */
describe('Notas e Tags (Postgres real) — U6', () => {
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

  describe('Note', () => {
    let noteId: string;

    it('cria nota em um registro (autor = quem criou)', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post('/api/notes')
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ entity: 'feedback', entityId: feedbackIdOfA, body: 'Primeira nota' })
        .expect(201);

      expect(res.body.author.id).toBe(tenantA.userId);
      noteId = res.body.id;
    });

    it('lista a nota pro próprio tenant', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/api/notes?entity=feedback&entityId=${feedbackIdOfA}`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .expect(200);

      expect(res.body.map((n: { id: string }) => n.id)).toContain(noteId);
    });

    it('tenant B não lê, não edita e não remove a nota do tenant A', async () => {
      const list = await request(testApp.app.getHttpServer())
        .get(`/api/notes?entity=feedback&entityId=${feedbackIdOfA}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`)
        .expect(200);
      expect(list.body).toHaveLength(0);

      await request(testApp.app.getHttpServer())
        .patch(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`)
        .send({ body: 'Tentativa de alteração' })
        .expect(404);

      await request(testApp.app.getHttpServer())
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`)
        .expect(404);
    });

    it('autor edita a própria nota', async () => {
      const res = await request(testApp.app.getHttpServer())
        .patch(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ body: 'Nota editada', pinned: true })
        .expect(200);

      expect(res.body.body).toBe('Nota editada');
      expect(res.body.pinned).toBe(true);
    });

    it('nega acesso quando "entity" não existe no catálogo de permissões', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/notes')
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ entity: 'recurso-que-nao-existe', entityId: feedbackIdOfA, body: 'Não deveria entrar' })
        .expect(403);

      await request(testApp.app.getHttpServer())
        .get(`/api/notes?entity=recurso-que-nao-existe&entityId=${feedbackIdOfA}`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .expect(403);
    });

    it('remove a nota', async () => {
      await request(testApp.app.getHttpServer())
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .expect(204);
    });
  });

  describe('Tag e RecordTag', () => {
    let recordTagId: string;

    it('cria tag na hora e já anexa ao registro', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post('/api/record-tags')
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ entity: 'feedback', entityId: feedbackIdOfA, name: 'Urgente', color: 'danger' })
        .expect(201);

      expect(res.body.tag.name).toBe('Urgente');
      expect(res.body.tag.color).toBe('danger');
      recordTagId = res.body.id;
    });

    it('anexar a mesma tag de novo é idempotente (não duplica)', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post('/api/record-tags')
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ entity: 'feedback', entityId: feedbackIdOfA, name: 'Urgente', color: 'danger' })
        .expect(201);

      expect(res.body.id).toBe(recordTagId);
    });

    it('tenant B não lista e não remove a tag do registro do tenant A', async () => {
      const list = await request(testApp.app.getHttpServer())
        .get(`/api/record-tags?entity=feedback&entityId=${feedbackIdOfA}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`)
        .expect(200);
      expect(list.body).toHaveLength(0);

      await request(testApp.app.getHttpServer())
        .delete(`/api/record-tags/${recordTagId}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`)
        .expect(404);
    });

    it('a tag criada aparece no autocomplete do tenant', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/tags?search=Urg')
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .expect(200);

      expect(res.body.some((tag: { name: string }) => tag.name === 'Urgente')).toBe(true);
    });

    it('remove a tag do registro', async () => {
      await request(testApp.app.getHttpServer())
        .delete(`/api/record-tags/${recordTagId}`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .expect(204);
    });
  });

  it('excluir o feedback remove notas e tags dele (sem órfão)', async () => {
    const created = await request(testApp.app.getHttpServer())
      .post('/api/feedbacks')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ title: 'Feedback descartável' })
      .expect(201);
    const feedbackId = created.body.id;

    const note = await request(testApp.app.getHttpServer())
      .post('/api/notes')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ entity: 'feedback', entityId: feedbackId, body: 'Nota que deveria sumir' })
      .expect(201);

    await request(testApp.app.getHttpServer())
      .post('/api/record-tags')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ entity: 'feedback', entityId: feedbackId, name: 'Descartável', color: 'neutral' })
      .expect(201);

    await request(testApp.app.getHttpServer())
      .delete(`/api/feedbacks/${feedbackId}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(200);

    const notesAfter = await request(testApp.app.getHttpServer())
      .get(`/api/notes?entity=feedback&entityId=${feedbackId}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(200);
    expect(notesAfter.body).toHaveLength(0);

    const tagsAfter = await request(testApp.app.getHttpServer())
      .get(`/api/record-tags?entity=feedback&entityId=${feedbackId}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(200);
    expect(tagsAfter.body).toHaveLength(0);

    // nota direta (sem passar pelo /api/notes) pra confirmar que o id
    // específico também sumiu, não só o filtro por entityId.
    await request(testApp.app.getHttpServer())
      .patch(`/api/notes/${note.body.id}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ body: 'não deveria existir mais' })
      .expect(404);
  });
});
