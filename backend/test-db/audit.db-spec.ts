import request from 'supertest';
import { Client } from 'pg';
import { createTestApp, TestApp } from './helpers/app';
import { registerTenant, Session } from './helpers/flows';

interface AuditRow {
  action: string;
  type: string;
  after: string | null;
  before: string | null;
}

async function queryAuditRowsFor(userId: string, type: string): Promise<AuditRow[]> {
  // DATABASE_URL (role owner) bypassa RLS de propósito aqui — o teste
  // precisa inspecionar o que ficou gravado independente da RLS, não
  // reproduzi-la (isso já é coberto por isolation.db-spec.ts). Filtra por
  // `type` (LOGIN/LOGIN_FAILED) — `action` é sempre o método HTTP (POST).
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<AuditRow>(
      'SELECT action, type, after, before FROM audits WHERE "userId" = $1 AND type = $2',
      [userId, type],
    );
    return result.rows;
  } finally {
    await client.end();
  }
}

// `AuditInterceptor`/`AuthService` chamam `auditService.register(...)` sem
// `await` (`void register().catch(...)`) de propósito — a auditoria nunca
// pode atrasar a resposta HTTP. Isso corre em paralelo com o fim da
// requisição: consultar o banco imediatamente após o `request(...)`
// resolver é uma corrida real contra essa escrita assíncrona, não um
// detalhe de teste. Poll curto (até 2s) em vez de uma query única.
async function auditRowsFor(userId: string, type: string): Promise<AuditRow[]> {
  const deadline = Date.now() + 2000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await queryAuditRowsFor(userId, type);
    if (rows.length > 0 || Date.now() >= deadline) {
      return rows;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * C3 (docs/PLAN-fase-12.md): `AuditService.register` gravava com
 * `PrismaService` (RLS) fora de `runWithTenantContext`; rotas
 * `@Public()` (login) não tinham tenant no `AsyncLocalStorage`, a
 * policy recusava o insert e o `catch` vazio do `AuthService` engolia
 * o erro — nenhum LOGIN/LOGIN_FAILED ficava auditado. Corrigido na
 * etapa 12.4.
 */
describe('Auditoria de login (Postgres real)', () => {
  let testApp: TestApp;
  let admin: Session;

  beforeAll(async () => {
    testApp = await createTestApp();
    admin = await registerTenant(testApp.app, { password: 'SenhaForte123' });
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('login certo grava um registro LOGIN', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'SenhaForte123' })
      .expect(200);

    const rows = await auditRowsFor(admin.userId, 'LOGIN');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('senha errada grava um registro LOGIN_FAILED', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'senha-errada-123' })
      .expect(401);

    const rows = await auditRowsFor(admin.userId, 'LOGIN_FAILED');
    expect(rows.length).toBeGreaterThan(0);
  });

  // Depende de bloqueio por conta via Redis (etapa 1.6) — sem Redis real
  // neste ambiente o bloqueio nem chega a acontecer; falha por um motivo
  // extra além do C3, mas `it.failing` continua correto nos dois casos.
  // Validar o motivo exato (RLS, não Redis) fica para o CI, que sobe um
  // service `redis` de verdade. App dedicado (não o `testApp` do describe)
  // pra não gastar o limite de 5/min de `/auth/login` dos outros cenários
  // (o throttle é por instância, em memória — ver etapa 12.13).
  it.failing('conta bloqueada grava LOGIN_FAILED com reason account_locked', async () => {
    const lockoutApp = await createTestApp();
    try {
      const victim = await registerTenant(lockoutApp.app, { password: 'SenhaForte123' });

      for (let i = 0; i < 5; i += 1) {
        await request(lockoutApp.app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: victim.email, password: 'senha-errada-123' });
      }

      const rows = await auditRowsFor(victim.userId, 'LOGIN_FAILED');
      const locked = rows.find((row) => {
        const payload = row.after ? (JSON.parse(row.after) as { reason?: string }) : null;
        return payload?.reason === 'account_locked';
      });
      expect(locked).toBeDefined();
    } finally {
      await lockoutApp.close();
    }
  });

  it('nenhum registro de auditoria contém segredos (password, tokens)', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const result = await client.query<{ before: string | null; after: string | null }>(
        'SELECT before, after FROM audits WHERE "userId" = $1',
        [admin.userId],
      );
      const blob = JSON.stringify(result.rows);
      expect(blob).not.toMatch(/SenhaForte123|senha-errada-123/);
      expect(blob.toLowerCase()).not.toContain('"password"');
      expect(blob.toLowerCase()).not.toContain('"access_token"');
      expect(blob.toLowerCase()).not.toContain('"refresh_token"');
    } finally {
      await client.end();
    }
  });
});
