# Backup e restauração

> Etapa 10.6 do `Plano Base.md`. Os scripts foram escritos e revisados,
> mas **não executei um ciclo de backup/restore real** — este ambiente de
> agente não tem `pg_dump`/`pg_restore`/`docker` disponíveis. Rodar o
> passo a passo abaixo uma vez em staging (como a própria etapa já prevê)
> é validação de quem tiver acesso a esse ambiente.

## Quando rodar

- Diariamente em produção, antes do job de retenção de auditoria (etapa
  10.1) — ele expurga dados, então um backup recente garante que dar
  errado o prazo configurado (`AUDIT_RETENTION_DAYS`) não é irreversível.
- Sempre antes de uma migration que não seja só aditiva (remove coluna,
  muda tipo) ou antes de restaurar outro backup.
- Retenção sugerida: 7 backups diários + 4 semanais — ajuste ao volume
  real de dados e ao orçamento de storage.

## Backup

```bash
cd backend
npm run backup:db
# ou um caminho específico:
npm run backup:db -- ./backups/antes-da-migration-x.dump
```

`scripts/backup-db.ts` roda `pg_dump --format=custom` contra
`DATABASE_URL` (role owner — a role `app_runtime` não tem privilégio pra
isso) e grava em `backend/backups/<timestamp>.dump` por padrão (pasta no
`.gitignore`, nunca comite um dump). Formato custom comprime e permite
restore seletivo com `pg_restore`.

Em produção, redirecione a saída pra storage durável (S3/R2/bucket do seu
provedor) — o script só gera o arquivo local; copiar pra fora da máquina
é responsabilidade de quem agenda a rotina (cron, job do provedor).

## Restauração

```bash
cd backend
npm run restore:db -- ./backups/2026-10-24T03-00-00.dump
```

`scripts/restore-db.ts` roda `pg_restore --clean --if-exists` contra
`DATABASE_URL` — `--clean` apaga os objetos existentes antes de recriar
os do dump, pra não misturar dados velhos com o conteúdo restaurado.

**Depois de restaurar, sempre rode:**

```bash
npm run sync:permissions
```

O catálogo de permissões (`core/authorization/permission-catalog.ts`)
pode ter ganhado entradas novas entre a data do backup e agora — o sync
preenche o que faltar em cada tenant, sem duplicar o que já existe
(idempotente).

## Teste de restauração

Antes de confiar na rotina em produção, valide uma vez (em staging, nunca
direto em produção):

1. `npm run backup:db` contra o banco de staging.
2. Restaure esse mesmo dump num banco **separado** (`docker compose
   -f docker-compose.yml run --rm db ...` com um volume novo, ou qualquer
   Postgres descartável) via `npm run restore:db`.
3. Rode `npm run sync:permissions` e confirme que a aplicação sobe contra
   esse banco restaurado e loga normalmente.
