import { Client } from 'pg';
import { TERMS_DOCUMENT, CURRENT_TERMS_VERSION } from '@core/auth/legal-terms.constants';

/**
 * D11 (docs/PLAN-fundacao-ux.md): `prisma/seed.ts` não gravava
 * `emailVerifiedAt` nem um `ConsentRecord` pro usuário admin — os dois
 * banners (`!emailVerified`/`!termsAccepted`, `app/(app)/layout.tsx`)
 * apareciam sempre em dev. O `global-setup.ts` do test-db já roda o seed
 * de verdade (`prisma migrate reset`, Prisma 7 não aceita `--skip-seed`),
 * então este teste confere o estado real deixado por ele.
 */
describe('Seed de desenvolvimento (Postgres real) — D11', () => {
  it('usuário admin tem e-mail verificado e termos aceitos', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const userResult = await client.query<{
        id: string;
        emailVerifiedAt: Date | null;
      }>('SELECT id, "emailVerifiedAt" FROM users WHERE email = $1', [
        'admin@exemplo.com',
      ]);

      const user = userResult.rows[0];
      expect(user).toBeDefined();
      expect(user.emailVerifiedAt).not.toBeNull();

      const consentResult = await client.query(
        'SELECT 1 FROM consent_records WHERE "userId" = $1 AND document = $2 AND version = $3',
        [user.id, TERMS_DOCUMENT, CURRENT_TERMS_VERSION],
      );
      expect(consentResult.rowCount).toBeGreaterThan(0);
    } finally {
      await client.end();
    }
  });
});
