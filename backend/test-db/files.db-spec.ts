import request from 'supertest';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, Session } from './helpers/flows';

/**
 * D6 (docs/PLAN-fundacao-ux.md): a URL de preview de arquivo apontava pro
 * backend (`http://localhost:5000/...`), bloqueada pela CSP `img-src 'self'`
 * do frontend e inalcançável num deploy com backend privado (Railway). A
 * correção: `GET /files/:id/content` (autenticado, tenant-scoped) serve os
 * bytes direto; `avatarUrl`/`logoUrl` passam a ser `/api/proxy/files/:id/content`
 * (same-origin), não mais a URL assinada absoluta do storage provider.
 */
describe('Conteúdo de arquivo same-origin (Postgres real) — D6', () => {
  let testApp: TestApp;
  let admin: Session;
  let other: Session;
  let fileId: string;

  const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app);
    other = await registerTenant(testApp.app);

    const uploadRes = await request(testApp.app.getHttpServer())
      .post('/api/files')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('file', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' });

    fileId = uploadRes.body.id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('devolve os bytes do arquivo pro próprio tenant', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/files/${fileId}/content`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(res.body, TINY_PNG)).toBe(0);
  });

  it('nega acesso ao arquivo de outro tenant', async () => {
    await request(testApp.app.getHttpServer())
      .get(`/api/files/${fileId}/content`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(404);
  });

  it('PATCH /me com avatarFileId devolve avatarUrl same-origin', async () => {
    const res = await request(testApp.app.getHttpServer())
      .patch('/api/me')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ avatarFileId: fileId })
      .expect(200);

    expect(res.body.avatarUrl).toBe(`/api/proxy/files/${fileId}/content`);
  });
});
