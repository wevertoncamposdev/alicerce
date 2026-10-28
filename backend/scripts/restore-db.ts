// Etapa 10.6 (Plano Base.md) — restauração via pg_restore a partir de um
// dump gerado por backup-db.ts. `--clean --if-exists`: zera o schema antes
// de restaurar, pra não misturar dados velhos com o que está no dump. Usa
// DATABASE_URL (role owner) pelo mesmo motivo do backup.
//
// Depois de restaurar um dump antigo, rode `npm run sync:permissions` —
// o catálogo de permissões pode ter mudado desde o backup (ver docs/backup.md).
//
// Uso: npm run restore:db -- caminho/do/arquivo.dump
import { execFileSync } from 'child_process';

function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL não definida.');
    process.exit(1);
  }

  const input = process.argv[2];
  if (!input) {
    console.error('Uso: npm run restore:db -- caminho/do/arquivo.dump');
    process.exit(1);
  }

  execFileSync(
    'pg_restore',
    ['--clean', '--if-exists', `--dbname=${databaseUrl}`, input],
    { stdio: 'inherit' },
  );

  console.log(`Restaurado a partir de ${input}. Rode "npm run sync:permissions" a seguir.`);
}

main();
