import request from 'supertest';
import { Client } from 'pg';
import { createTestApp } from './helpers/app';
import { registerTenant, login, inviteAndAccept, refreshWith } from './helpers/flows';

const PASSWORD = 'SenhaForte123';

/**
 * C4 (docs/PLAN-fase-12.md): `refreshTokens` tolera reuso de um token já
 * revogado por até 10s (`REFRESH_TOKEN_REUSE_GRACE_MS`) — pensado pra duas
 * abas renovando ao mesmo tempo, mas vale também pra revogação de
 * segurança (encerrar sessão, trocar senha): dá pra "ressuscitar" a sessão
 * dentro da janela. Corrige na etapa 12.5.
 *
 * Cada `it()` sobe sua própria app (não um `testApp` compartilhado no
 * describe): o throttle de `/auth/login`/`/auth/register` (5/min,
 * `@Throttle`, em memória por instância) é cumulativo entre `it()`s que
 * compartilham app — vários logins em sequência bateriam o limite e
 * mascarariam o teste com 429 em vez do 401/200 esperado.
 */
describe('Revogação de sessão e tolerância de reuso do refresh (Postgres real)', () => {
  it.failing('encerrar sessão + refresh imediato com o cookie dela → 401', async () => {
    const testApp = await createTestApp();
    try {
      const user = await registerTenant(testApp.app, { password: PASSWORD });
      const other = await login(testApp.app, user.email, PASSWORD);

      const sessions = await request(testApp.app.getHttpServer())
        .get('/api/me/sessions')
        .set('Authorization', `Bearer ${other.accessToken}`)
        .set('Cookie', other.refreshCookie)
        .expect(200);

      const current = (sessions.body as Array<{ familyId: string; isCurrent: boolean }>).find(
        (s) => s.isCurrent,
      );
      if (!current) throw new Error('Sessão atual não identificada em GET /me/sessions.');

      await request(testApp.app.getHttpServer())
        .delete(`/api/me/sessions/${current.familyId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(204);

      const result = await refreshWith(testApp.app, other.refreshCookie);
      expect(result.status).toBe(401);
    } finally {
      await testApp.close();
    }
  });

  it.failing('trocar senha + refresh imediato de outra sessão → 401', async () => {
    const testApp = await createTestApp();
    try {
      const user = await registerTenant(testApp.app, { password: PASSWORD });
      const sessionA = await login(testApp.app, user.email, PASSWORD);
      const sessionB = await login(testApp.app, user.email, PASSWORD);

      await request(testApp.app.getHttpServer())
        .post('/api/me/password')
        .set('Authorization', `Bearer ${sessionA.accessToken}`)
        .set('Cookie', sessionA.refreshCookie)
        .send({ currentPassword: PASSWORD, newPassword: 'OutraSenhaForte456' })
        .expect(204);

      const result = await refreshWith(testApp.app, sessionB.refreshCookie);
      expect(result.status).toBe(401);
    } finally {
      await testApp.close();
    }
  });

  it('duas renovações paralelas do mesmo cookie (corrida de abas) → ambas 200', async () => {
    const testApp = await createTestApp();
    try {
      const user = await registerTenant(testApp.app, { password: PASSWORD });
      const session = await login(testApp.app, user.email, PASSWORD);

      const [first, second] = await Promise.all([
        refreshWith(testApp.app, session.refreshCookie),
        refreshWith(testApp.app, session.refreshCookie),
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
    } finally {
      await testApp.close();
    }
  });

  it('reset de senha revoga todos os refresh tokens do usuário no banco', async () => {
    const testApp = await createTestApp();
    try {
      const user = await registerTenant(testApp.app, { password: PASSWORD });
      await login(testApp.app, user.email, PASSWORD);
      await login(testApp.app, user.email, PASSWORD);

      await request(testApp.app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      const token = testApp.mail.getLastTokenFor(user.email);
      await request(testApp.app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'ResetadaForte789' })
        .expect(200);

      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      try {
        const result = await client.query<{ revokedAt: Date | null }>(
          'SELECT "revokedAt" FROM refresh_tokens WHERE "userId" = $1',
          [user.userId],
        );
        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.rows.every((row) => row.revokedAt !== null)).toBe(true);
      } finally {
        await client.end();
      }
    } finally {
      await testApp.close();
    }
  });

  it('desativar o usuário bloqueia o próximo refresh', async () => {
    const testApp = await createTestApp();
    try {
      // O admin não pode desativar a própria conta (regra do "último
      // admin") — convida um segundo usuário e desativa ele, não o admin.
      const admin = await registerTenant(testApp.app, { password: PASSWORD });
      const victim = await inviteAndAccept(testApp.app, testApp.mail, admin);
      const victimSession = await login(testApp.app, victim.email, 'SenhaForte123');

      await request(testApp.app.getHttpServer())
        .patch(`/api/user/${victim.userId}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      const result = await refreshWith(testApp.app, victimSession.refreshCookie);
      expect(result.status).toBe(401);
    } finally {
      await testApp.close();
    }
  });
});
