# ADR 0012 — Usuário de plataforma e autenticação separada

- Status: aceito
- Data: 2026-10-24
- Escopo: autorizado pelo ADR 0006 (Fase 11 do `Plano Base.md`, bloco
  "Management mínimo").
  - Em `core/` (novo diretório, não toca nada existente em `core/auth`):
    `backend/src/core/platform-auth/platform-auth.module.ts`,
    `platform-auth.service.ts`, `platform-auth.controller.ts`,
    `platform-auth.guard.ts`, `current-platform-user.decorator.ts`,
    `dto/platform-login.dto.ts`.
  - Fora de `core/`, mas de infraestrutura/documentação:
    `backend/prisma/models/platform/platform-user.prisma` (novo), migration
    `CreatePlatformUser`, `backend/src/core/config/env.schema.ts`
    (`PLATFORM_JWT_SECRET`), `backend/.env.example`,
    `backend/scripts/create-platform-user.ts`.
  - `frontend/proxy.ts` (ramo condicional para `/platform/*`).
  - Nada além dessa lista em `core/` sem perguntar.

## Contexto

A Fase 11 ("Management mínimo") pede: lista de tenants com status/uso,
suspender/reativar tenant, e uma caixa única de feedbacks de todas as
tenants. O próprio `Plano Base.md` já marca como pré-requisito um ADR de
"usuário da plataforma" (fora dos tenants) com autenticação separada — e por
bom motivo: mapeando a base atual, `tenantId` é obrigatório em toda a cadeia
de autenticação/autorização:

- O JWT de hoje sempre carrega `tenantId` (`AuthService.signToken`,
  `JwtPayload`); não existe, estruturalmente, um usuário autenticado sem
  tenant.
- `TenantScopeGuard` (global) exige `request.user.tenantId` resolvido para
  qualquer rota que não seja `@Public()`.
- `RolesPermissionsGuard` e o cache de permissões (`PermissionCacheService`)
  são chaveados por `tenantId + userId`; o catálogo de permissões
  (`PERMISSION_CATALOG`) é materializado por tenant — não existe hoje nenhum
  conceito de "permissão global".
- `User.email` é único globalmente (ADR 0002), mas isso rege só o model
  `User` — não impede um model novo, sem relação com `Tenant`, com seu
  próprio namespace de e-mail.
- No frontend, `proxy.ts`, os cookies de sessão (`session_token`,
  `session_tenant`) e o BFF proxy (`/api/proxy/[...path]`) presumem um único
  usuário-de-tenant por sessão; o proxy sempre injeta `x-tenant-id`.

Por outro lado, parte do trabalho já está feita, deliberadamente deixada
pendente até este ADR:

- `Tenant.status` já inclui `SUSPENDED` no enum `Status`, e
  `AuthService.isUserOrTenantBlocked` (Fase 1.1) já bloqueia login/refresh
  para qualquer status diferente de `ACTIVE` — suspender/reativar não exige
  nenhuma mudança nesse mecanismo, só um endpoint que troque o status.
- A permissão `tenant.manage` já existe no catálogo
  (`permission-catalog.ts`) com `grantToTenantAdmin: false`, e comentários
  no código (`tenant.controller.ts`, `tenant.service.ts`) já citam
  "reservado para o futuro `management` (Fase 11)".
- `PrismaBootstrapService` (conecta como role Postgres *owner*, ignora RLS)
  já existe e já é usado por `AuthService` pelo mesmo motivo que o
  management vai precisar: consulta cross-tenant fora do contexto de um
  tenant resolvido.
- `@Public()` já existe e já pula `AuthGuard`/`TenantScopeGuard` globais —
  dá para isolar rotas novas do pipeline de tenant sem alterá-lo.

## Decisão

### 1. Novo model `PlatformUser`, sem relação com `User`/`Tenant`

Campos: `id`, `email` (único — namespace próprio, não reabre o ADR 0002, que
só fala de `User`), `passwordHash`, `name`, `status`, `createdAt`,
`updatedAt`. Fica em `backend/prisma/models/platform/platform-user.prisma`,
pasta nova paralela a `main/`. **Fora de `TENANT_SCOPED_MODELS`**: sem
`tenantId`, sem migration de RLS — a extension
(`tenant-rls.extension.ts`) só intercepta models da allowlist; um model fora
dela passa direto pelo Prisma Client normal, sem exigir contexto de tenant.

Sem self-signup: único jeito de criar um `PlatformUser` é o script
`backend/scripts/create-platform-user.ts` (mesmo estilo de
`backup-db.ts`/`restore-db.ts`), rodado manualmente por quem administra a
infraestrutura. Convite/self-service fica fora do "mínimo".

### 2. Autenticação paralela, sem tocar no pipeline global existente

Novo JWT com formato próprio — `{ sub, username, scope: 'platform' }`, sem
`tenantId` — assinado com secret próprio, `PLATFORM_JWT_SECRET` (novo em
`env.schema.ts`/`.env.example`). Secret separado do `JWT_SECRET` de tenant é
defesa em profundidade barata: garante que um token de tenant nunca é aceito
numa rota de platform por engano, mesmo que a lib de JWT valide a assinatura
corretamente contra o secret errado (ela simplesmente falha).

Rotas novas marcadas `@Public()` — pulam `AuthGuard`/`TenantScopeGuard`
globais — e protegidas localmente por `PlatformAuthGuard`, novo, que valida
esse JWT e popula `request.platformUser`. Resultado: **zero mudança** em
`AuthGuard`, `TenantScopeGuard`, `RequestContextInterceptor`,
`RolesPermissionsGuard` ou no cache de permissões — o pipeline de tenant
existente continua intocado; a autenticação de plataforma vive inteiramente
ao lado dele, não dentro dele.

Novo `backend/src/core/platform-auth/` (mirrors `core/auth/` na forma, não
no conteúdo): `platform-auth.module.ts`, `.service.ts` (login com bcrypt,
igual padrão de `AuthService.signIn`), `.controller.ts`
(`POST /platform-auth/login`, `GET /platform-auth/me`), `.guard.ts`,
`current-platform-user.decorator.ts`.

Permissão de platform user é **binária**: autenticado = acesso total às
rotas de management. Não reaproveita o catálogo de permissões — ele é
inteiramente por-tenant hoje; inventar um conceito de "permissão global" só
para isto seria contorcido. Granularidade (ex.: "management" vs
"financeiro") fica explicitamente adiada — o próprio `Plano Base.md` separa
"impersonação auditada, feature flags" como trabalho pós-mínimo.

### 3. Negócio em `backend/src/modules/management/` — 5ª categoria de entidade

A taxonomia do AGENTS §4.3 (Módulo / Módulo Relacionado / Feature / Extensão
de Módulo) presume sempre tenant-scoped. O código de management não é — este
ADR registra uma 5ª categoria, **"Módulo de Plataforma"**: cross-tenant,
autenticado por `PlatformAuthGuard` (não `RolesPermissionsGuard`), lê/escreve
via `PrismaBootstrapService` (não `PrismaService`), fora da RLS por
natureza.

- `GET /management/tenants` — `id, legalName, slug, status` + contagem de
  usuários/feedbacks via `_count` do Prisma (sem contador denormalizado
  novo).
- `PATCH /management/tenants/:id/status` — `ACTIVE`/`SUSPENDED`, reusa o
  enum `Status` já existente. "Suspender" já tem efeito pleno em
  login/refresh via `isUserOrTenantBlocked` (Fase 1.1) — nenhuma mudança
  nessa parte.
- `GET /management/feedbacks` — leitura cross-tenant paginada, adaptando os
  helpers de `tenant-search.util.ts` sem o `where.tenantId` fixo, incluindo
  o tenant de origem em cada linha.

### 4. Exceção deliberada a AGENTS §4.2.7 ("toda escrita é auditada")

`Audit.userId` é obrigatório e FK para `User` (`access.prisma:131`). Um
`PlatformUser` não é um `User` — gravar ações de management em `Audit`
exigiria afrouxar essa constraint (tornar `userId` opcional, ou abrir uma
segunda FK), uma mudança de `core/` maior do que o escopo deste ADR, e que
mistura dois conceitos de ator hoje deliberadamente separados.

Decisão: `suspend`/`reactivate` de tenant são logados via `Logger`
estruturado do Nest (ator = e-mail do platform user, ação, tenant afetado),
não gravados em `Audit`. Fica como pendência explícita — auditoria formal de
ações de management é trabalho natural para quando "impersonação auditada"
(pós-mínimo) entrar, e nesse ponto vale revisitar o modelo de `Audit` como
um todo em vez de remendar.

### 5. Frontend — grupo de rotas e sessão paralelos

Novo `frontend/src/app/(platform)/`, sessão própria:

- Cookie `platform_session_token` (httpOnly), emitido por
  `app/api/platform/login/route.ts` (mesmo padrão de `api/auth/login`). Sem
  `session_tenant` — não se aplica a um ator sem tenant.
- Novo `app/api/platform-proxy/[...path]/route.ts`: mesmo padrão do proxy
  atual, mas sem injetar `x-tenant-id`, apontando para
  `${INTERNAL_API_URL}/management/...` e `/platform-auth/...`.
- `frontend/proxy.ts` ganha um ramo condicional: path começando com
  `/platform` checa `platform_session_token` em vez de `session_token`, com
  seu próprio redirect para `/platform/login`. Única edição num arquivo
  "core" existente do frontend; autorizada por este ADR.
- Não reaproveita `alicerceModules`/`authz.ts` (amarrados a permissão
  por-tenant) — nav do grupo é uma lista fixa no `(platform)/layout.tsx`,
  consistente com a autorização binária da decisão 2.
- Telas simples (tabela + ação), sem `DetailView`/`TypeView`/
  `DetailViewScreen` do core de domínio (presumem tenant-scoped): Server
  Component + Server Action direta para suspender/reativar. Sem módulo
  registrado em `bootstrap.ts`/`alicerce.config.ts`.

### Alternativas rejeitadas

- **Estender `User` com `tenantId` opcional**: reabriria o invariante
  "`tenantId` sempre presente" em toda a cadeia (JWT, RLS, guards, cache de
  permissões, frontend) — exatamente o tipo de mudança de grande raio que
  o congelamento do `core/` (ADR 0006) existe para evitar. Rejeitada.
- **Adaptar `RolesPermissionsGuard`/`TenantScopeGuard` para aceitar ausência
  de tenant**: mesmo problema — toca guards globais que hoje servem só o
  caso tenant-scoped, para um caso de uso completamente diferente.
  Rejeitada em favor de um guard novo e paralelo.
- **Gravar ações de management em `Audit` afrouxando `userId`**: resolveria
  a exceção da decisão 4, mas mistura dois atores conceitualmente diferentes
  numa tabela pensada para um só; maior que o escopo de "mínimo". Adiada,
  não descartada — revisitar junto da "impersonação auditada".

## Consequências

- Dois sistemas de autenticação paralelos e independentes (tenant e
  plataforma), cada um com seu secret, seu guard, seu formato de cookie —
  mais superfície, mas sem acoplamento: nenhum dos dois pode comprometer o
  outro por engano.
- `PlatformUser` não aparece em nenhuma tela de domínio nem em
  `syncPermissionCatalog()` — é inteiramente ortogonal ao RBAC por-tenant.
- Ações de management não deixam trilha em `Audit` nesta rodada — só log de
  aplicação. Qualquer auditoria formal de management precisa ser desenhada
  de novo (não é só "usar o `AuditService` existente").
- O gerador (`new-module.mjs`) e o guia (`docs/guia-novo-modulo.md`)
  continuam descrevendo só os 4 tipos de entidade tenant-scoped — "Módulo de
  Plataforma" é uma categoria deliberadamente fora do gerador, não extensível
  por `npm run new:module`.
