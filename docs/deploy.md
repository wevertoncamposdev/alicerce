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

## 8. Railway

> Provedor escolhido pra F5 (`docs/Plan-Finalizacao.md`). Adapta os passos
> 1–7 acima: dois serviços a partir dos `Dockerfile`s existentes
> (`backend/`, `frontend/`) + Postgres e Redis gerenciados pelo próprio
> Railway — sem `docker-compose.yml` nem o serviço `migrate` dele (cada
> serviço Railway builda e roda sozinho; variáveis entre serviços se
> referenciam com `${{ServiceName.VAR}}`).
>
> **Sobre `railway.json`:** este repo tem `backend/railway.json` e
> `frontend/railway.json` (builder Dockerfile + healthcheck + restart
> policy). Esse formato ("Config as Code") está **deprecado** pelo próprio
> Railway em favor de "Infrastructure as Code" (`.railway/railway.ts`),
> mas continua funcionando até **2026-12-01**. Se essa data já passou
> quando você for ler isto, confira a documentação atual do Railway antes
> de confiar nesses dois arquivos — o que não expira é configurar Root
> Directory/Builder/Healthcheck direto no dashboard de cada serviço
> (Settings → Build / Settings → Deploy), que funciona do mesmo jeito.

### 8.1 Criar os serviços

Num Project novo no Railway:

1. **New → Database → Add PostgreSQL** e **New → Database → Add Redis**
   (plugins gerenciados — não precisa de imagem própria).
2. **New → GitHub Repo**, apontando pro repositório, duas vezes (um
   serviço por pasta):
   - `backend`: Settings → Root Directory `backend/`. Com `backend/railway.json`
     no repo, o builder e o healthcheck já vêm configurados; sem ele (ou
     depois de dez/2026), configure manualmente: Build → Builder =
     Dockerfile, Dockerfile Path = `Dockerfile`; Deploy → Healthcheck Path
     = `/api/health`.
   - `frontend`: Settings → Root Directory `frontend/`. Mesma ideia com
     `frontend/railway.json` (sem healthcheck path — o Next não tem um
     endpoint dedicado, o Railway cai pro check de porta TCP).
3. `backend` → Settings → Networking: **não gere domínio público** (só o
   Next fala com ele, pela rede privada do Railway — ver F5: "o backend
   não precisa ficar público"). `frontend` → Settings → Networking:
   gere o domínio público (ou aponte um domínio próprio em Domains).

### 8.2 Variáveis de ambiente

Backend (`backend` → Variables), além da tabela da seção 2:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (privada — só outros serviços do projeto alcançam) |
| `DATABASE_PUBLIC_URL` | `${{Postgres.DATABASE_PUBLIC_URL}}` — **não é lida pela app**; só existe aqui pra comandos avulsos (migrate/backup) rodados do seu computador via `railway run` (§8.4/§8.5), que não alcançam a URL privada |
| `APP_DATABASE_URL` | monte à mão depois de criar a role, ver §8.3 |
| `APP_DATABASE_PUBLIC_URL` | idem, variante pública — **também não é lida pela app**; só pra scripts que usam `PrismaService`/`app_runtime` (ex. `create:platform-user`) rodados do seu computador, ver §8.3 |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` / `PLATFORM_JWT_SECRET` / `COOKIE_SECRET` | três valores diferentes de `openssl rand -hex 32` |
| `CORS_ORIGINS` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `FRONTEND_URL` | mesma coisa: `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `NODE_ENV` | `production` |
| `PORT` | **não defina** — o Railway injeta a própria e a app já lê `process.env.PORT` |

Frontend (`frontend` → Variables):

| Variável | Valor |
| --- | --- |
| `INTERNAL_API_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:5000/api` |

`PORT` também não se define aqui — mesmo motivo.

### 8.3 Role de runtime (`app_runtime`)

O plugin Postgres do Railway só dá a connection string do owner. Abra um
`psql` já autenticado contra ele:

```bash
railway connect postgres
```

Dentro do `psql`, rode o SQL da seção 4 acima (`CREATE ROLE app_runtime
...`) com uma senha forte (`openssl rand -hex 24`, por exemplo). Depois,
em `backend` → Variables, defina as duas variantes (mesma senha nas duas,
só o host/porta mudam):

```text
APP_DATABASE_URL=postgresql://app_runtime:<senha que você criou>@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
APP_DATABASE_PUBLIC_URL=postgresql://app_runtime:<a mesma senha>@${{Postgres.RAILWAY_TCP_PROXY_DOMAIN}}:${{Postgres.RAILWAY_TCP_PROXY_PORT}}/${{Postgres.PGDATABASE}}
```

(`PGHOST`/`PGPORT` do plugin Postgres resolvem pro domínio privado — é o
que a app de verdade usa em runtime, nunca pelo proxy público.
`RAILWAY_TCP_PROXY_DOMAIN`/`RAILWAY_TCP_PROXY_PORT`, os mesmos que o
próprio plugin usa pra montar `DATABASE_PUBLIC_URL`, são a variante
alcançável do seu computador — só serve pra scripts avulsos como
`create:platform-user`, que conectam com `PrismaService`/`app_runtime`.)

### 8.4 Migrações e sync de permissões

O estágio final do `backend/Dockerfile` não leva o CLI do Prisma nem
`scripts/` (só `dist/` + deps de produção, de propósito — imagem enxuta).
Rode migrate/sync do seu computador com o Railway CLI, que injeta as
variáveis do serviço — mas troque `DATABASE_URL` pela pública na hora,
porque o comando roda na sua máquina, fora da rede privada do Railway:

```bash
railway link        # uma vez, associa este repo ao projeto Railway
cd backend           # prisma.config.ts e os scripts vivem aqui — não rode da raiz
railway run --service backend -- sh -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" npx prisma migrate deploy'
railway run --service backend -- sh -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" npm run sync:permissions'
```

(Confira `railway run --help` se a flag `--service` mudou de nome na
versão instalada.) Repita essas duas linhas a cada deploy que mude
migrations ou o catálogo de permissões — os dois comandos são
idempotentes.

### 8.5 Deploy

Com os serviços criados e as variáveis preenchidas, o Railway builda e
sobe sozinho a cada push na branch configurada (ou `railway up` pra um
deploy manual a partir do seu checkout local). HTTPS já vem de graça no
domínio `*.up.railway.app` (ou no seu domínio próprio, via Settings →
Domains).

### 8.6 Verificação

Mesma seção 7 acima. Como o backend não tem domínio público, teste o
health check de dentro da rede do Railway:

```bash
railway run --service backend -- sh -c 'curl -s http://localhost:5000/api/health'
```

E o login de verdade pela tela, no domínio público do frontend.
