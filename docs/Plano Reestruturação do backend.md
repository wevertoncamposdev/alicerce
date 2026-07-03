# Plano: Reestruturação do backend para aderência à arquitetura

Auditoria completa do backend feita via subagente de exploração comparando com architecture.md e plan.md. O plano está salvo em `/memories/session/plan.md`. Resumo abaixo, organizado como Milestones/Issues no GitHub, seguindo a convenção já definida em plan.md (branch naming, Conventional Commits, squash merge).

## Gap analysis resumido

| Área | Estado atual | Gap crítico |
| --- | --- | --- |
| Auth | JWT access-only (1h), sem refresh | Falta refresh rotativo + logout/revogação |
| Tenancy | Middleware extrai tenantId, mas `x-tenant-id` aceito sem validação cruzada em alguns casos; sem RLS; `Favorite` **sem tenantId** (bug crítico) | Vazamento de tenant |
| RBAC | Guard funcional, mas permissions "congeladas" no JWT até 1h | Sem Redis, sem invalidação imediata |
| Audit | Interceptor cobre CRUD + login, só grava `after` | Sem correlation id, sem before/after, sem eventos de falha |
| Observability | Só `console.log` | Sem OpenTelemetry, sem correlation id, sem logging estruturado |

### Milestones propostas (ordem sugerida: A → B → {C,D em paralelo} → F → E)

**A — Security Hotfix: Tenant Isolation** (P0, bloqueia tudo)

1. `security(tenancy)`: adicionar `tenantId` ao model `Favorite` + migration + filtro em favorites.service.ts
2. `security(tenancy)`: rejeitar (403) quando `x-tenant-id` divergir do claim JWT em tenant.middleware.ts
3. `chore(tenancy)`: aplicar middleware/guard de tenant globalmente, não só em `/api/tenant/:tenantId/*`

**B — Row Level Security no Postgres** (P0/P1, depende de A)

1. Migration manual com `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` por `tenant_id`
2. `PrismaService` executando `SET LOCAL app.tenant_id` por request
3. `RequestContext` via `AsyncLocalStorage` para propagar tenantId

**C — Refresh Token Rotativo** (P1, paralelo a B)

1. `POST /auth/refresh` com rotação + reuse detection (novo model `RefreshToken`)
2. `POST /auth/logout` com revogação
3. Integrar refresh no BFF do frontend (retry-on-401)

**D — Cache de Permissões (Redis)** (P1/P2, paralelo a B/C)

1. Adicionar `ioredis` ao backend/infra
2. Mover fonte de permissões do JWT estático para cache Redis (TTL curto)
3. Invalidar cache ao alterar role/permission

**F — Observabilidade (fazer antes de E)**

1. Middleware de correlation ID (`x-request-id`), reaproveitando o `AsyncLocalStorage` de B.3
2. Instrumentação OpenTelemetry (HTTP + Prisma)
3. Logger estruturado (pino) substituindo `console.log`

**E — Audit Hardening** (depende de F.1 para correlationId)

1. Capturar before/after + correlationId no `audit.interceptor.ts`
2. Auditar falhas 401/403

### Como conduzir com apoio de IA

- Cada Milestone vira um Milestone no GitHub; cada item vira uma Issue (Epic/Feature/Task/Security), vinculada ao Project com campos Módulo/Risco preenchidos.
- 1 Issue → 1 branch → 1 PR pequeno (`Closes #N`) → squash merge em `develop`.
- Peça à IA para implementar **uma Issue por sessão**, não o milestone inteiro — mantém PRs revisáveis e testáveis isoladamente.

### Decisões assumidas

- Ordem por severidade de segurança, já que a documentação não define prioridade explícita entre esses gaps.
- RLS via SQL manual em migration (Prisma não gera RLS nativamente).

Quer que eu ajuste a ordem, quebre alguma milestone em mais issues, ou já está pronto para você abrir os itens no GitHub?
