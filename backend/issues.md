# Estado atual vs plano

Fiz um raio-x do backend comparando com o `development-backend.md`. Resumo:

| Milestone | Status |
| --- | --- |
| **A** — Tenant Isolation | ⚠️ 2/3 — falta filtro `tenantId` em `favorites.service.ts` e aplicar guard globalmente |
| **B** — RLS Postgres | ❌ 0/3 — nada implementado |
| **C** — Refresh Token | ✅ 3/3 — completo (inclusive retry-on-401 no BFF) |
| **D** — Cache Redis | ❌ 0/3 — `ioredis` nem está no `package.json` |
| **F** — Observabilidade | ⚠️ leve — só `console.log`, sem correlation-id nem OTel |
| **E** — Audit Hardening | ⚠️ parcial — audita ação/payload, mas sem before/after, sem correlationId, sem 401/403 |

Como C já está pronto, a ordem original (`A → B → {C,D} → F → E`) vira: **fechar A → B → D (paralelo a B) → F → E**.

## Plano de continuidade

### Fase 1 — Fechar Milestone A (P0, bloqueia release — vazamento de tenant ainda ativo)

| # | Issue | Branch | Critério de aceite |
| --- | --- | --- | --- |
| A.1 | `security(tenancy)`: filtrar `tenantId` em `favorites.service.ts` (`findAll`, e demais métodos que faltarem) | `security/favorites-tenant-filter` | Usuário do tenant B não vê favorito do tenant A (teste automatizado) |
| A.2 | `chore(tenancy)`: aplicar `TenantScopeGuard` globalmente via `APP_GUARD`, com `@Public()`/`@SkipTenantScope()` para rotas que não precisam (ex.: `/auth/*`) | `chore/tenant-guard-global` | Rota fora de `/tenant/:tenantId` também rejeita `x-tenant-id` divergente |

Isso fecha o P0 de segurança que já está documentado como crítico.

### Fase 2 — Milestone B: RLS no Postgres (P0/P1, depende de A)

| # | Issue | Branch |
| --- | --- | --- |
| B.1 | `RequestContext` via `AsyncLocalStorage` propagando `tenantId` (base para B.2 e F.1) | `feature/request-context-als` |
| B.2 | `PrismaService` com `$extends`/middleware executando `SET LOCAL app.tenant_id` a cada request, lendo do `RequestContext` | `feature/prisma-rls-session-var` |
| B.3 | Migration manual: `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` por `tenant_id` em todas as tabelas multitenant | `security/rls-policies-tenant-tables` |

B.1 é reaproveitado depois em F.1 (correlation-id), por isso vem primeiro.

### Fase 3 — Milestone D: Cache de permissões Redis (paralelo à Fase 2)

| # | Issue | Branch |
| --- | --- | --- |
| D.1 | Adicionar `ioredis` + módulo de conexão | `chore/redis-client-setup` |
| D.2 | Mover leitura de permissões do JWT estático para cache Redis (TTL curto), mantendo JWT só com `roles` básicas | `feature/permission-cache-redis` |
| D.3 | Invalidar cache ao alterar role/permission (hook nos services de Role/Permission) | `feature/permission-cache-invalidation` |

### Fase 4 — Milestone F: Observabilidade (antes de E, pois E depende do correlationId)

| # | Issue | Branch |
| --- | --- | --- |
| F.1 | Middleware de correlation-id (`x-request-id`) usando o `AsyncLocalStorage` da Fase 2 | `feature/correlation-id-middleware` |
| F.2 | Logger estruturado com `pino`/`nestjs-pino`, substituindo `console.log` no `logging.interceptor.ts` | `chore/pino-structured-logger` |
| F.3 | OpenTelemetry básico (HTTP + Prisma) | `feature/otel-instrumentation` |

### Fase 5 — Milestone E: Audit Hardening (fecha o plano)

| # | Issue | Branch |
| --- | --- | --- |
| E.1 | Capturar `before`/`after` + `correlationId` no `audit.interceptor.ts` | `feature/audit-before-after-correlation` |
| E.2 | Auditar falhas 401/403 (novo filtro/interceptor dedicado a eventos de segurança) | `feature/audit-auth-failures` |

## Próxima ação recomendada

Começar por **A.1** (`favorites.service.ts` sem filtro de tenant) — é o vazamento de dados mais concreto e o fix é pequeno (1 PR, poucas linhas). Quer que eu já implemente essa issue agora?
