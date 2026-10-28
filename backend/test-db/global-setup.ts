import { execFileSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

const BACKEND_ROOT = path.join(__dirname, '..');

// Troca só o nome do banco na URL (último segmento do path), preservando
// host/porta/credenciais/role — é o que diferencia DATABASE_URL de
// APP_DATABASE_URL (role owner vs. app_runtime) e precisa continuar valendo
// no banco de teste.
function withTestDatabaseName(url: string): string {
  return url.replace(/\/([^/?]+)(\?.*)?$/, '/alicerce_test$2');
}

// Jest carrega este arquivo com `--runInBand` no MESMO processo dos specs
// — por isso mutar `process.env` aqui é visível neles depois. O
// `dotenv.config()` do @nestjs/config (chamado de novo em cada
// `createTestingModule` de cada spec) não sobrescreve uma env já definida
// (comportamento padrão do dotenv, `override: false`), então a troca de
// banco feita aqui sobrevive para toda a suíte.
//
// `globalSetup` do Jest roda fora do `moduleNameMapper` (os aliases
// `@core/*`/`@modules/*`/`@src/*` não resolvem aqui, só dentro dos próprios
// specs) — por isso migração e sync de permissões rodam via `execFileSync`
// chamando os scripts npm já existentes (mesmo caminho de
// `tsx -r tsconfig-paths/register`, comprovado no `sync:permissions`),
// não importando `ScriptsModule` direto.
export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });

  if (!process.env.DATABASE_URL || !process.env.APP_DATABASE_URL) {
    throw new Error(
      'DATABASE_URL/APP_DATABASE_URL ausentes — configure backend/.env antes de rodar test:e2e:db.',
    );
  }

  // Precisa existir ANTES de `migrate reset` poder conectar nela — conecta
  // com a URL original (banco de dev, já existe) só pra emitir o CREATE
  // DATABASE; não se pode criar um banco estando conectado a ele mesmo.
  const adminClient = new Client({ connectionString: process.env.DATABASE_URL });
  await adminClient.connect();
  try {
    await adminClient.query('CREATE DATABASE alicerce_test');
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== '42P04') throw error; // 42P04 = database already exists
  } finally {
    await adminClient.end();
  }

  process.env.DATABASE_URL = withTestDatabaseName(process.env.DATABASE_URL);
  process.env.APP_DATABASE_URL = withTestDatabaseName(
    process.env.APP_DATABASE_URL,
  );
  process.env.NODE_ENV = 'test';
  process.env.MAIL_DRIVER = 'console';
  process.env.THROTTLE_DISABLED = 'true';

  // `shell: true` — no Windows, `npx`/`npm` são `.cmd`; `execFileSync` sem
  // shell não resolve a extensão e falha com ENOENT.
  execFileSync('npx', ['prisma', 'migrate', 'reset', '--force'], {
    cwd: BACKEND_ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });

  // D11 (docs/PLAN-fundacao-ux.md): `migrate reset --force` NÃO roda o
  // seed sozinho nesta configuração (`prisma.config.ts`, formato novo) —
  // testado direto: o output termina na lista de migrations aplicadas,
  // sem nenhuma seção de seed. Sem este passo explícito,
  // `admin@exemplo.com`/`tenant-exemplo` nunca existem em `alicerce_test`
  // e nenhum teste que dependa do seed (ex.: `seed.db-spec.ts`) encontra
  // nada. (Comentário antigo aqui assumia o auto-seed; estava errado.)
  execFileSync('npm', ['run', 'seed'], {
    cwd: BACKEND_ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });

  // Idempotente — já roda dentro do seed acima, mas o módulo de tenant/
  // role pode mudar o catálogo sem passar pelo seed; mantém a garantia.
  execFileSync('npm', ['run', 'sync:permissions'], {
    cwd: BACKEND_ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });
}
