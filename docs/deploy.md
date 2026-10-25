# Deploy de referência

> Etapa 10.5 do `Plano Base.md`. Documenta a infra que já existe no
> repositório (`docker-compose.yml`, `backend/Dockerfile`,
> `frontend/Dockerfile`, migrations) — não inventa nada novo. O passo a
> passo abaixo foi seguido e os comandos confirmados localmente; subir um
> ambiente de staging de verdade seguindo só este documento é validação de
> quem tiver acesso a `docker`/a um host real (não disponível neste
> ambiente de agente).

## 1. Build

```bash
docker compose build
```

Usa os `Dockerfile`s já existentes: `backend/Dockerfile` (multi-stage,
`npx prisma generate` + `npm run build`, runtime só com `dist/` e
dependências de produção) e `frontend/Dockerfile` (usa o output
`standalone` do Next, ver `output: "standalone"` em `next.config.ts`).

## 2. Variáveis de ambiente

Checklist a partir de `backend/.env.example` e `frontend/.env.example` —
copie e preencha antes de subir qualquer ambiente que não seja só a sua
máquina:

| Variável | Obrigatória? | O que faz |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão role **owner** — só migrations/seed usam. |
| `APP_DATABASE_URL` | sim | Conexão role `app_runtime` (passo 4) — é a que a app usa em runtime; sem ela, RLS não vale de verdade. |
| `REDIS_URL` | sim (recomendado) | Cache de permissões; sem Redis a app sobe e cai pro Postgres (fail-open). |
| `JWT_SECRET` / `COOKIE_SECRET` | sim | Nunca reuse entre si nem use o default de dev. Gere com `openssl rand -hex 32`. |
| `CORS_ORIGINS` | sim | Origem do frontend (BFF é a única origem confiável). |
| `PORT` | não (default 5000) | Porta do backend. |
| `NODE_ENV` | sim em produção | `production` liga logger estruturado e desliga o Swagger. |
| `STORAGE_DRIVER` + `S3_*` | não (default `local`) | `s3` fala com S3/R2/MinIO — preencha os `S3_*` só nesse caso. |
| `MAIL_DRIVER` + `SMTP_*`/`RESEND_API_KEY` | não (default `console`) | Igual ao storage: só preenche o bloco do driver escolhido. |
| `FRONTEND_URL` | sim | Base dos links nos e-mails (convite, reset de senha...). |
| `AUDIT_RETENTION_DAYS` | não (default 365) | Prazo do expurgo de auditoria (etapa 10.1/9.4). |
| `MONITORING_DRIVER` + `SENTRY_DSN` | não (default `console`) | `sentry` exige `SENTRY_DSN` (etapa 10.2). |
| `INTERNAL_API_URL` (frontend) | sim | URL do backend vista pelo *servidor* Next — nunca chega ao browser. |
| `NEXT_PUBLIC_SENTRY_DSN` (frontend) | não | Monitoramento no browser (etapa 10.2). |

## 3. Migrações

```bash
cd backend
npx prisma migrate deploy
```

Mesmo comando que o CI (`.github/workflows/ci.yml`, job `backend-e2e`)
já roda contra um Postgres de serviço. **Nunca** `prisma migrate dev` em
produção (gera migration nova a partir do schema; `deploy` só aplica as
que já existem).

## 4. Role de runtime (fora do histórico de migrations)

Em dev, a migration `add_app_runtime_role`
(`backend/prisma/migrations/20261016024534_add_app_runtime_role/migration.sql`)
já cria a role `app_runtime` com a senha `app_runtime` — aceitável só
porque é dev local. **Em produção, crie a role manualmente** (a senha não
deveria viver versionada em git) e aponte `APP_DATABASE_URL` pra ela via
secrets do seu provedor:

```sql
CREATE ROLE app_runtime LOGIN PASSWORD '<senha forte, fora do git>';
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
```

Sem essa role (sem privilégio de owner), as políticas de RLS (migration
`add_tenant_rls`) não têm efeito nenhum — a role owner ignora RLS por
padrão no Postgres.

## 5. Sincronizar o catálogo de permissões

```bash
cd backend
npm run sync:permissions
```

Roda `PermissionCatalogSyncService.syncAll()` (ver
`scripts/sync-permission-catalog.ts`): cria no banco qualquer permissão do
catálogo (`core/authorization/permission-catalog.ts`) que ainda não existe
em cada tenant, e regrava as concessões do papel ADMIN de sistema. Rode
depois de toda `migrate deploy` que mudou o catálogo — é idempotente.

## 6. Subir os serviços

```bash
docker compose up -d
```

`docker-compose.yml` já define `db` (Postgres 17) e `redis` (Redis 7) com
healthcheck, e `backend`/`frontend` com `depends_on: service_healthy`. Pra
um ambiente real fora do compose (ex.: Postgres/Redis gerenciados), troque
só `DATABASE_URL`/`APP_DATABASE_URL`/`REDIS_URL` — o resto do compose
(build, variáveis do backend/frontend) é o mesmo.

## 7. Verificação

- `GET /api/health` (backend) — `HealthModule` já existente.
- Login com um usuário de teste e confirmar que `GET /auth/profile`
  devolve as permissões esperadas (prova que o sync de permissões rodou).
- Se `MAIL_DRIVER=smtp`/`resend`: disparar um "esqueci minha senha" e
  confirmar que o e-mail chega.
