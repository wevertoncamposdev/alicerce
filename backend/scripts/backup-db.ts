// Etapa 10.6 (Plano Base.md) — backup do Postgres via pg_dump, formato
// custom (`-Fc`): comprime e permite restore seletivo/paralelo com
// pg_restore (ver restore-db.ts e docs/backup.md). Usa DATABASE_URL (role
// owner) — não dá pra fazer backup completo com a role app_runtime, que só
// tem SELECT/INSERT/UPDATE/DELETE, sem privilégio de leitura de schema.
//
// Uso: npm run backup:db [-- caminho/do/arquivo.dump]
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function defaultOutputPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'backups', `${timestamp}.dump`);
}

function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL não definida.');
    process.exit(1);
  }

  const output = process.argv[2] ?? defaultOutputPath();
  fs.mkdirSync(path.dirname(output), { recursive: true });

  execFileSync('pg_dump', ['--format=custom', `--file=${output}`, databaseUrl], {
    stdio: 'inherit',
  });

  console.log(`Backup gravado em ${output}`);
}

main();
