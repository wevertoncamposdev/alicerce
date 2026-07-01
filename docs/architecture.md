# Plano de Arquitetura — Template SaaS Multitenant (Next.js + NestJS)

## 1) Visão de Arquitetura

### Diagrama textual dos blocos

```bash
                                   ┌─────────────────────────┐
                                   │        Browser          │
                                   └────────────┬─────────────┘
                                                │ HTTPS (cookie httpOnly, mesma origem)
                                   ┌────────────▼─────────────┐
                                   │   Next.js (App Router)   │
                                   │  Server Components (RSC) │
                                   │  Route Handlers (BFF)    │
                                   │  Server Actions          │
                                   │  Middleware (edge guard) │
                                   └────────────┬─────────────┘
                                                │ HTTPS interno + Bearer JWT
                                   ┌────────────▼─────────────┐
                                   │      NestJS API          │
                                   │  Auth / IAM (RBAC)       │
                                   │  Tenancy middleware      │
                                   │  Domain modules          │
                                   │  Audit interceptor       │
                                   └──┬───────┬───────┬───────┘
                                      │       │       │
                         ┌────────────▼─┐ ┌──▼────┐ ┌─▼─────────────┐
                         │  PostgreSQL  │ │ Redis │ │ Queue (BullMQ/│
                         │ (shared,     │ │ cache │ │  SQS/RabbitMQ)│
                         │  tenant_id)  │ │ perms │ │  jobs async   │
                         └──────────────┘ └───────┘ └───────────────┘
                                      │
                         ┌────────────▼─────────────┐
                         │   Observability Stack     │
                         │ OpenTelemetry Collector    │
                         │ Logs (Loki/CloudWatch)     │
                         │ Traces (Tempo/Jaeger)      │
                         │ Metrics (Prometheus/Grafana│
                         └────────────────────────────┘

                         ┌────────────────────────────┐
                         │   Identity (opcional v1+)  │
                         │  OIDC/SAML IdP externo      │
                         └────────────────────────────┘
```

### Decisões arquiteturais principais

| Decisão | Escolha | Justificativa |
|         |         |               |
| Padrão de renderização | Server Components por padrão | Reduz bundle no client, permite fetch direto no servidor com cache nativo do Next, evita expor token/lógica sensível ao browser |
| Comunicação Front↔API | Next.js como BFF (Route Handlers/Server Actions) | Cookie httpOnly nunca é lido pelo client; tradução cookie→Bearer acontece só no servidor; evita CORS com credentials |
| Autenticação | JWT (access curto) + refresh token, sessão via cookie httpOnly | Stateless na API, sessão gerenciável no Next; refresh rotativo mitiga replay |
| Autorização | RBAC no MVP, desenhado para ABAC depois | RBAC cobre 80% dos casos com baixa complexidade; ABAC adicionado como policy engine incremental (ex.: CASL, OPA) sem quebrar o modelo |
| Isolamento multitenant | Shared schema com `tenant_id` + Row Level Security (RLS) no Postgres | Menor custo operacional no MVP, caminho claro de evolução para schema-per-tenant se necessário |
| Cache de permissões | Redis, chave por `userId+tenantId`, TTL curto + invalidação ativa | Evita hit no banco a cada request sem servir permissão desatualizada por muito tempo |
| Observabilidade | OpenTelemetry desde a Fase 0 | Instrumentar depois é caro; correlação de trace/tenant precisa nascer junto com o request |

### Trade-offs de cada decisão

- **Server Components por padrão**: ganha performance/segurança, perde familiaridade (curva de aprendizado, debugging distribuído entre server/client).
- **BFF no Next.js**: um ponto a mais de operação (mais um "servidor" logicamente), mas elimina classe inteira de bugs de CORS/token-em-localStorage.
- **Shared schema + RLS**: simples e barato, mas isolamento depende de disciplina de código (toda query precisa respeitar `tenant_id`) — mitigado com RLS como rede de segurança no banco, não só na aplicação.
- **RBAC → ABAC depois**: entrega rápido, mas exige desenhar o schema de permissões (roles/permissions) já pensando em não travar a extensão futura (ex.: permissions com `resource:action`, não strings soltas).
- **Refresh token rotativo**: mais seguro contra roubo de token, mas exige lógica de revogação e storage de família de tokens (ou blacklist).

### Riscos e mitigação

| Risco | Mitigação |
|       |           |
| Vazamento de dado entre tenants por query sem filtro | RLS no Postgres como última linha de defesa + testes automatizados de isolamento (Fase 2/10) |
| Token JWT roubado via XSS | httpOnly cookie + CSP restritiva + nunca expor token a JS |
| Escalonamento de privilégio (usuário de tenant A assume role em tenant B) | Validar `tenant_id` do claim/context em toda operação de autorização, não confiar em `tenant_id` vindo do client |
| Custo de observabilidade crescer sem controle | Definir retenção e amostragem (sampling) de traces desde o início |
| Acoplamento excessivo do template a um domínio específico | Manter módulos de domínio (`features/*`) plugináveis, sem lógica de negócio dentro de `iam/`, `tenancy/`, `audit/` |

---

## 2) Estratégia de Multitenancy

### Opções

| Estratégia | Prós | Contras |
|            |      |         |
| **Shared schema** (uma tabela, coluna `tenant_id`) | Simples, barato, migração única, fácil de operar | Isolamento depende 100% de filtro correto em toda query; "vizinho barulhento" pode afetar performance de outros tenants |
| **Schema por tenant** | Isolamento lógico mais forte, backup/restore por tenant possível | Migrações precisam rodar N vezes; connection pool mais complexo; catálogo de schemas para gerenciar |
| **Banco por tenant** | Isolamento físico total, ótimo para compliance/enterprise | Custo operacional alto, provisionamento dinâmico complexo, não escala bem para milhares de tenants pequenos |

### Recomendação

- **MVP**: shared schema + `tenant_id` obrigatório em toda tabela de domínio + **Row Level Security (RLS)** no Postgres, com a sessão de banco recebendo o `tenant_id` via `SET app.tenant_id` por request.
- **Evolução v1+**: manter shared schema para tenants padrão; oferecer **schema-per-tenant** como tier "enterprise" opcional para clientes que exigem isolamento mais forte (feature flag no provisionamento, não reescrita de arquitetura).
- Banco por tenant fica reservado para casos de compliance extremo (ex.: setor público, saúde) e é tratado como exceção, não padrão.

### Como resolver tenant

Ordem de prioridade recomendada (do mais robusto ao mais simples):

1. **JWT claim** (`tenant_id` dentro do token, assinado) — fonte de verdade para autorização. Não pode ser sobrescrito pelo client.
2. **Subdomínio** (`acme.suaapp.com`) — bom para UX e branding, usado para *resolver* qual tenant está sendo acessado antes do login (ex.: tela de login já sabe o tenant).
3. **Header** (`x-tenant-id`) — usado internamente entre Next.js (BFF) e NestJS, mas sempre **validado contra o claim do JWT**, nunca confiado isoladamente.

Regra de ouro: o `tenant_id` que importa para autorização é sempre o do **JWT**, nunca o de header/query/body enviado pelo client sem validação cruzada.

### Como propagar tenant context

- **Next.js**: `tenant_id` ativo guardado em cookie não-sensível (não httrue-secret) para UX (seletor de tenant), lido em Server Components via `cookies()` e repassado como header ao chamar a API.
- **NestJS**: um **Tenancy Middleware/Guard** roda antes de qualquer controller, extrai `tenant_id` do JWT, injeta em um `RequestContext` (via `AsyncLocalStorage` ou request-scoped provider), e é esse contexto — não o header cru — que os repositórios usam para filtrar queries e para o `SET app.tenant_id` do RLS.

### Regras obrigatórias anti data leak

1. Nenhuma query de domínio pode rodar sem `tenant_id` no `WHERE` — reforçado por RLS, não só por convenção de código.
2. Nenhum endpoint de escrita pode aceitar `tenant_id` vindo do body/query como fonte de verdade — sempre do contexto de autenticação.
3. Toda entidade de domínio tem `tenant_id` indexado e `NOT NULL`.
4. Testes de integração dedicados simulam dois tenants e verificam que um nunca vê dado do outro (ver seção 10).
5. Logs de auditoria sempre carregam `tenant_id`, mesmo em erros e tentativas negadas.

---

## 3) Plano em Fases (MVP → v1)

### Fase 0 — Foundation / Boilerplate

- **Objetivo**: erguer o esqueleto técnico compartilhado por tudo que vem depois.
- **Entregáveis**: monorepo (ou dois repos) configurado, lint/format/commitlint, CI básico (build+lint+test), Next.js com App Router + estrutura de pastas definida, NestJS com módulos vazios (`iam`, `tenancy`, `audit`, `common`), Postgres com migrations iniciais, Docker Compose para dev local, OpenTelemetry SDK plugado (sem dashboards ainda).
- **DoD**: `docker compose up` sobe front+API+DB; CI verde; health-check endpoint respondendo; trace básico aparecendo no collector.
- **Riscos**: escolher ferramenta errada de observabilidade/ORM cedo demais e ter retrabalho — mitigar escolhendo peças trocáveis (ORM atrás de repository pattern).
- **Estimativa**: M

### Fase 1 — Auth + Tenant Context

- **Objetivo**: login/registro funcionando fim a fim com cookie httpOnly, resolução de tenant, e context propagado até o banco.
- **Entregáveis**: endpoints de auth no Nest (login, refresh, logout), Route Handlers de BFF no Next (login/logout/me), middleware de proteção de rota, Tenancy Middleware no Nest com RLS configurado.
- **DoD**: usuário loga, sessão sobrevive a refresh de página, troca de tenant funciona, teste de isolamento básico (2 tenants) passa.
- **Riscos**: modelar RLS errado e travar performance — mitigar com índice em `tenant_id` desde o início.
- **Estimativa**: M

### Fase 2 — RBAC / Permissions

- **Objetivo**: autorização granular funcionando, com cache.
- **Entregáveis**: entidades Role/Permission/RolePermission, guard de permissão no Nest, cache Redis de permissões por usuário+tenant, UI mínima de gestão de roles.
- **DoD**: endpoint sensível bloqueia usuário sem permissão; matriz de roles documentada; invalidação de cache ao mudar role reflete em < 1 request.
- **Riscos**: sobre-engenharia de permissões cedo demais — mitigar com naming `resource:action` simples, sem regras condicionais (isso fica pra ABAC).
- **Estimativa**: M

### Fase 3 — Audit Log + Observabilidade

- **Objetivo**: toda ação sensível é rastreável, com correlação de request.
- **Entregáveis**: interceptor de auditoria no Nest, tabela `audit_event`, correlation-id propagado front→API→logs, dashboards mínimos (latência, erro, login falho).
- **DoD**: uma ação (ex.: mudança de role) gera evento de auditoria consultável com quem/quando/tenant/antes-depois.
- **Riscos**: log excessivo virar custo/ruído — mitigar com lista fechada de eventos auditáveis (seção 6).
- **Estimativa**: S/M

### Fase 4 — Hardening de Segurança

- **Objetivo**: fechar a superfície de ataque antes de virar template reutilizável.
- **Entregáveis**: rate limiting, headers de segurança (CSP, HSTS, etc.), rotação de refresh token, revisão de CORS, dependency scan no CI, testes de isolamento de tenant automatizados.
- **DoD**: checklist da seção 7 100% nos itens obrigatórios.
- **Riscos**: hardening tardio quebrar fluxo já construído — mitigar rodando esses testes desde a Fase 1 em paralelo, não só no fim.
- **Estimativa**: M

### Fase 5 — Template Final + DX

- **Objetivo**: transformar o projeto num template reutilizável para novos produtos.
- **Entregáveis**: script de scaffold (novo módulo de domínio em minutos), documentação de arquitetura, exemplos de feature ponta a ponta usando o template, CI de template (garante que "clonar e rodar" funciona).
- **DoD**: um dev consegue clonar, rodar `setup`, e ter login+RBAC+audit funcionando em < 30 min sem tocar em `iam`/`tenancy`.
- **Riscos**: template genérico demais perder utilidade — mitigar mantendo um exemplo de domínio real (ex.: "tasks") como referência viva.
- **Estimativa**: S/M

---

## 4) Estrutura de Pastas Recomendada

### 4.1 Frontend Next.js

```bash
frontend/
├── middleware.ts                  # guard de rota na edge, checa cookie de sessão
├── app/
│   ├── (public)/                  # rotas sem sessão: login, register, landing
│   │   └── auth/...
│   ├── (app)/                     # rotas autenticadas
│   │   ├── layout.tsx             # valida sessão no servidor (Server Component)
│   │   └── [modulo]/page.tsx      # ex.: users, roles — Server Component busca dados
│   └── api/
│       ├── auth/{login,logout,me,refresh}/route.ts   # BFF de auth
│       └── proxy/[...path]/route.ts                  # BFF genérico cookie→Bearer
├── modules/                       # organização por domínio (não por tipo de arquivo)
│   └── users/
│       ├── server/                # loaders/fetchers: `await fetch` direto no servidor
│       │   └── get-users.ts
│       ├── actions/                # Server Actions (mutações: create/update/delete)
│       │   └── create-user.ts
│       ├── components/             # Client Components mínimos (formulário, tabela interativa)
│       └── types.ts
├── server/
│   ├── session.ts                  # `import "server-only"` — leitura/escrita de cookie, getSession()
│   └── api-server.ts               # helper de fetch server-side pra API Nest (com cache/revalidate)
├── lib/
│   └── api-client.ts               # fetch client-side, só fala com /api/proxy
├── shared/
│   ├── ui/                         # componentes de design system puros (sem lógica de domínio)
│   └── hooks/
└── contexts/
    └── auth-context.tsx            # estado leve de sessão no client (user, permissões, tenant ativo)
```

Onde ficam as peças pedidas:

- **Server Actions** → `modules/<dominio>/actions/*.ts`, com `"use server"` no topo.
- **Loaders/fetchers server-side** → `modules/<dominio>/server/*.ts`, chamados direto de dentro de Server Components (`app/(app)/.../page.tsx`).
- **Validação de sessão** → `server/session.ts` (helper) + checada no `layout.tsx` de `(app)/` e reforçada no `middleware.ts`.
- **Guards no lado servidor** → dentro do próprio `layout.tsx`/Server Component (redirect se não autenticado/sem permissão) — não em `useEffect`.
- **Componentes client mínimos** → só o que precisa de interatividade (form, tabela com sort/filtro, modais) em `modules/<dominio>/components/`, recebendo dados via props vindos do Server Component pai.

### 4.2 Backend NestJS

```bash
backend/
├── src/
│   ├── main.ts
│   ├── common/
│   │   ├── filters/                # exception filters (padrão de erro único)
│   │   ├── interceptors/           # logging, transform de resposta
│   │   ├── decorators/             # @CurrentUser, @TenantId, @RequirePermission
│   │   └── pipes/                  # validação (class-validator)
│   ├── iam/                        # bounded context de identidade/acesso
│   │   ├── auth/
│   │   │   ├── strategies/         # jwt.strategy.ts, refresh.strategy.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── rbac/
│   │   │   ├── guards/             # roles.guard.ts, permissions.guard.ts
│   │   │   ├── policies/           # (preparação para ABAC futuro)
│   │   │   └── permission-cache.service.ts   # Redis
│   │   └── users/
│   ├── tenancy/
│   │   ├── tenancy.middleware.ts   # extrai tenant_id do JWT, seta RequestContext
│   │   ├── tenant-context.ts       # AsyncLocalStorage
│   │   └── tenants/                # CRUD de tenant
│   ├── audit/
│   │   ├── audit.interceptor.ts    # captura ação + antes/depois
│   │   ├── audit.service.ts
│   │   └── audit-event.entity.ts
│   ├── infra/
│   │   ├── database/               # config do ORM, RLS setup, migrations
│   │   ├── cache/                  # Redis module
│   │   ├── queue/                  # BullMQ/módulo de fila
│   │   └── observability/          # OpenTelemetry providers
│   └── modules/                    # domínio de negócio (plugável)
│       └── tasks/
│           ├── tasks.controller.ts
│           ├── tasks.service.ts
│           └── tasks.repository.ts
```

Onde ficam as peças pedidas:

- **Strategy/JWT guards** → `iam/auth/strategies/`.
- **Policies/permissions** → `iam/rbac/guards/` (enforcement) + `iam/rbac/policies/` (regras, hoje simples RBAC, amanhã ABAC).
- **Interceptors/filters** → `common/interceptors/` e `common/filters/`, aplicados globalmente em `main.ts`.
- **Logging/audit services** → `audit/`.
- **Repositórios/adapters** → dentro de cada módulo de domínio (`modules/<dominio>/*.repository.ts`), implementando uma interface, para permitir trocar Prisma/TypeORM sem vazar pro service.

---

## 5) Auth, Roles e Permissions (detalhado)

### Fluxo de autenticação recomendado

1. Login: Nest valida credencial, emite **access token** (JWT, curta duração — 10 a 15 min) e **refresh token** (opaco ou JWT, duração maior — dias), refresh token é persistido (hash) no banco associado ao usuário+dispositivo.
2. Next.js (BFF) recebe os dois tokens, guarda **ambos** em cookies httpOnly (nomes separados), nunca expõe ao client.
3. Renovação: Route Handler dedicado (`/api/auth/refresh`) troca o refresh token por um novo par access+refresh (**rotação**) — se o refresh usado já foi consumido antes, é sinal de reuso indevido → revoga toda a família de tokens daquele dispositivo.
4. Logout: revoga o refresh token no banco (não só apaga cookie) — assim um token roubado antes do logout não continua válido.

### Gestão de sessão segura

- Cookies: `httpOnly`, `secure` em produção, `sameSite=lax` (ou `strict` se não houver fluxo cross-site necessário).
- Access token nunca é logado, nunca aparece em URL, nunca vai para `localStorage`/`sessionStorage`.
- Refresh token com rotação + detecção de reuso (ver acima) é o controle mais importante contra roubo de sessão de longa duração.

### Modelo de autorização

- **RBAC no MVP**: usuário → tem uma ou mais Roles (por tenant, via `Membership`) → Role tem Permissions. Permission nomeada como `resource:action` (ex.: `users:create`, `audit:read`).
- **Desenho preparado para ABAC**: o guard de autorização não deve checar só "usuário tem a permission X", mas expor um ponto único (`can(user, action, resource, context)`) — no MVP essa função só olha RBAC; depois pode evoluir para avaliar atributos (ex.: "só edita tarefa do próprio time") sem mudar a interface usada pelos controllers.

### Matriz exemplo de roles x permissions

| Permission | Owner | Admin | Member | Viewer |
|            |       |       |        |        |
| `users:create` | ✅ | ✅ | ❌ | ❌ |
| `users:read` | ✅ | ✅ | ✅ | ✅ |
| `roles:manage` | ✅ | ✅ | ❌ | ❌ |
| `tenant:settings:update` | ✅ | ❌ | ❌ | ❌ |
| `audit:read` | ✅ | ✅ | ❌ | ❌ |
| `tasks:write` | ✅ | ✅ | ✅ | ❌ |

### Estratégia de cache para permissões

- Redis, chave `perm:{tenantId}:{userId}` → set de permissions resolvidas, TTL curto (ex.: 5 min) como rede de segurança.
- **Invalidação ativa**: qualquer mutação em Role/Membership/RolePermission dispara invalidação explícita da chave (não depender só do TTL) — evita janela longa de permissão desatualizada.

### Revogação e invalidação

- Revogar acesso de um usuário = revogar refresh tokens da família + invalidar cache de permissão. Access token antigo ainda válido por até sua curta duração (aceitável dado o TTL baixo) — para revogação imediata crítica, manter uma blacklist curta em Redis checada no guard.

---

## 6) Auditoria e Observabilidade (detalhado)

### O que logar

- **App logs**: erros, warnings, requests (nível info reduzido em produção).
- **Security logs**: login sucesso/falha, refresh reuse detectado, permissão negada, mudança de role/permission.
- **Audit events** (negócio + segurança, persistidos em tabela, não só em log): criação/edição/remoção de entidades sensíveis, mudanças de configuração de tenant, convites/remoções de usuário.

### Correlação de requisições

- `correlation-id` (ou `trace-id`) gerado no Next.js (Route Handler/middleware) se não vier do client, propagado via header até o Nest, incluído em todo log e no `audit_event`.

### OpenTelemetry

- **Traces**: cada request HTTP (Next→Nest→DB) instrumentado automaticamente via SDK; spans customizados em operações críticas (ex.: resolução de tenant, checagem de permissão).
- **Metrics**: latência por rota, taxa de erro, contagem de login falho, tamanho de fila.
- **Logs**: estruturados (JSON), correlacionados por `trace_id`.

### Dashboards e alertas mínimos

- Dashboard: latência p95/p99 por rota, taxa de erro 5xx, login falhos por minuto, fila (profundidade/erros).
- Alertas: taxa de erro acima de threshold, pico de login falho (possível brute force), fila travada.

### Política de retenção e privacidade (LGPD)

- Logs de aplicação: retenção curta (ex.: 30 dias).
- Audit events (compliance): retenção mais longa (ex.: 1-2 anos, conforme requisito legal do produto), com dado pessoal minimizado (armazenar id de referência, não payload completo com PII quando evitável).
- Direito ao esquecimento: audit events referentes a um usuário removido mantêm o evento (obrigação legal de trilha), mas anonimizam campos de PII diretos.

### Exemplos de eventos auditáveis críticos

- Login falho repetido, mudança de senha/e-mail, criação/remoção de usuário, mudança de role/permission, exportação de dados, mudança de configuração de tenant, acesso negado por tenant mismatch (indício de tentativa de breakout).

---

## 7) Segurança (Checklist prático)

### Obrigatórios para MVP

- [ ] Validação de input em toda rota (DTO + class-validator, whitelist ativo)
- [ ] Rate limiting em login/refresh/endpoints públicos
- [ ] CORS restrito a origens conhecidas; `credentials` só habilitado onde necessário (idealmente não é nem necessário, dado o padrão BFF)
- [ ] Cookies de sessão `httpOnly` + `secure` (prod) + `sameSite`
- [ ] Secrets fora do código (variáveis de ambiente / secret manager), nunca em `NEXT_PUBLIC_*`
- [ ] Headers de segurança: CSP, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, HSTS
- [ ] Toda checagem de autorização valida `tenant_id` do contexto autenticado, nunca do input do client
- [ ] RLS habilitado nas tabelas de domínio
- [ ] Senhas com hash forte (bcrypt/argon2), nunca reversível
- [ ] Dependency scan (`npm audit`/Snyk/Dependabot) no CI

### Recomendados para v1

- [ ] Rotação de refresh token com detecção de reuso
- [ ] MFA opcional
- [ ] SAST no CI (ex.: Semgrep)
- [ ] Testes automatizados de isolamento de tenant e de escalonamento de privilégio
- [ ] Revisão periódica de permissões (least privilege review)
- [ ] WAF/proteção de borda (se infraestrutura permitir)

---

## 8) Banco de Dados e Modelo Inicial

### Entidades mínimas

- **Tenant**: `id, name, slug, status, created_at`
- **User**: `id, email (único global ou por tenant, decidir), password_hash, status, created_at`
- **Membership**: `id, user_id, tenant_id, status` — vínculo N:N entre User e Tenant (um usuário pode pertencer a mais de um tenant)
- **Role**: `id, tenant_id (nullable se role for global/template), name`
- **Permission**: `id, key (ex.: users:create), description`
- **RolePermission**: `role_id, permission_id`
- **MembershipRole**: `membership_id, role_id` (um membership pode ter mais de uma role)
- **AuditEvent**: `id, tenant_id, actor_user_id, action, resource_type, resource_id, before, after, correlation_id, created_at`

### Índices e constraints essenciais

- `tenant_id` indexado em toda tabela de domínio (índice composto `(tenant_id, id)` quando fizer sentido para as queries mais comuns).
- `UNIQUE (tenant_id, slug)` em entidades com slug por tenant.
- `FOREIGN KEY` com `ON DELETE RESTRICT` em relações críticas (evitar deleção em cascata acidental de dado auditável).
- Constraint de `NOT NULL` em `tenant_id` de toda tabela multitenant.

### Estratégia de migrações

- Ferramenta de migration versionada (Prisma Migrate/TypeORM migrations), aplicada via pipeline CI/CD, nunca manual em produção.
- Migrations aditivas por padrão (evitar `DROP`/renomear em um único deploy — usar padrão *expand/contract*: adiciona coluna nova, migra dado, só depois remove a antiga em outro deploy).

### Soft delete e rastreabilidade

- Entidades sensíveis (User, Tenant, Role) usam `deleted_at` (soft delete) em vez de `DELETE` físico, preservando integridade referencial de audit events.
- Toda entidade de domínio carrega `created_at`, `updated_at`, e idealmente `created_by`/`updated_by` para rastreabilidade sem depender só do audit log.

---

## 9) Contratos de API e Convenções

### Padrão de resposta

```json
{ "data": { ... }, "meta": { "correlationId": "..." } }
```

### Padrão de erros

```json
{ "error": { "code": "PERMISSION_DENIED", "message": "...", "correlationId": "..." } }
```

- Código de erro estável (`code`) para o frontend tratar programaticamente, mensagem (`message`) apenas para exibição/log.

### Versionamento

- Prefixo de rota (`/api/v1/...`) desde o início, mesmo com uma única versão — evita breaking change silencioso depois.

### Idempotência para operações sensíveis

- Endpoints de criação sensíveis (ex.: convite de usuário, cobrança) aceitam header `Idempotency-Key`; requests repetidas com a mesma chave retornam o resultado original em vez de duplicar o efeito.

### Paginação e filtros multi-tenant

- Paginação cursor-based para listagens grandes (mais estável que offset sob escrita concorrente); todo filtro de listagem aplica `tenant_id` do contexto automaticamente, nunca aceito como parâmetro livre.

---

## 10) Qualidade, Testes e CI/CD

### Pirâmide de testes

- **Unit**: services, guards, policies de autorização isoladamente (maior volume).
- **Integration**: controllers + banco real (ou testcontainers), validando RLS e filtros de tenant.
- **E2E**: fluxos críticos de usuário (login → criar recurso → ver na lista), rodando contra ambiente próximo de produção.

### Testes críticos de isolamento de tenant

- Criar dois tenants + dois usuários; usuário do tenant A nunca consegue ler/escrever recurso do tenant B, mesmo manipulando IDs manualmente na request.

### Testes críticos de auth/autorização

- Usuário sem permission recebe 403 em toda rota protegida correspondente; token expirado é rejeitado; refresh reuso é detectado e revoga sessão.

### Pipeline CI mínima

1. Lint + type-check
2. Unit tests
3. Integration tests (com banco efêmero)
4. Build
5. SAST + dependency scan
6. Deploy (staging automático, produção com aprovação)

### Gates de qualidade e segurança

- Bloquear merge se: cobertura de testes cair abaixo do limite definido, lint falhar, vulnerabilidade `high`/`critical` encontrada, teste de isolamento de tenant falhar.

---

## 11) Roadmap de Evolução pós-v1

- **SSO/SAML/OIDC enterprise**: adicionar `iam/auth/strategies/` novas (SAML/OIDC) por trás da mesma interface de auth já usada, mapeando identidade externa para `Membership` existente.
- **ABAC**: evoluir `iam/rbac/policies/` para avaliar atributos de recurso/contexto além da role, mantendo a mesma função `can()` usada pelos guards.
- **Feature flags por tenant**: tabela `TenantFeature` + serviço de flags, checado nos módulos de domínio (não no `iam`/`tenancy`).
- **Billing por tenant**: módulo novo (`billing/`) integrado a um provedor (Stripe etc.), consumindo eventos de uso via fila.
- **Multi-região**: exige revisitar estratégia de dado (replicação/latência) — normalmente o gatilho que empurra tenants "enterprise" para banco dedicado por região.

---

## 12) Entrega Final Obrigatória

### 1. Tabela consolidada por fase

| Fase | Objetivo | Entregáveis | DoD | Riscos | Estimativa |
|      |          |             |     |        |            |
| 0 – Foundation | Esqueleto técnico | Monorepo, CI, Docker Compose, OTel básico | `docker compose up` funcional, CI verde | Escolha de ferramenta errada cedo | M |
| 1 – Auth + Tenant | Login/sessão/tenant fim a fim | BFF auth, middleware, RLS | Login persiste, isolamento básico ok | RLS mal configurado | M |
| 2 – RBAC | Autorização granular | Role/Permission, guard, cache Redis | 403 correto, invalidação de cache ok | Sobre-engenharia | M |
| 3 – Audit + Observabilidade | Rastreabilidade | Interceptor de audit, correlation-id, dashboards | Ação sensível gera evento consultável | Ruído/custo de log | S/M |
| 4 – Hardening | Fechar superfície de ataque | Rate limit, headers, rotação refresh, testes de isolamento | Checklist obrigatório 100% | Quebrar fluxo existente | M |
| 5 – Template + DX | Reuso para novos produtos | Scaffold, docs, exemplo de domínio | Clonar→rodar em <30min | Genérico demais | S/M |

### 2. Checklist de implementação sequencial

1. Subir monorepo/repos + CI + Docker Compose
2. Modelar Tenant/User/Membership + migrations
3. Implementar login/refresh/logout no Nest
4. Implementar BFF (Route Handlers) + cookie httpOnly no Next
5. Implementar middleware de tenant context + RLS no Postgres
6. Implementar Role/Permission/RolePermission + guard de autorização
7. Adicionar cache Redis de permissões + invalidação
8. Implementar audit interceptor + tabela `audit_event`
9. Propagar correlation-id ponta a ponta + instrumentar OpenTelemetry
10. Aplicar checklist de segurança obrigatório (rate limit, headers, CORS)
11. Escrever testes de isolamento de tenant e de autorização
12. Documentar arquitetura + extrair scaffold de novo módulo de domínio

### 3. Top 10 erros comuns ao construir base multitenant

1. Confiar em `tenant_id` vindo do client (body/query/header) sem validar contra o JWT.
2. Esquecer `tenant_id` em uma tabela ou índice, descoberto só em produção.
3. Guardar token sensível em `localStorage` (exposto a XSS).
4. Não ter teste automatizado de isolamento — só descobrir o vazamento manualmente (ou pior, um cliente descobre).
5. Cachear permissão sem estratégia de invalidação (usuário removido continua com acesso).
6. Misturar lógica de negócio dentro de `iam`/`tenancy`, acoplando o template a um domínio específico.
7. Auditoria implementada tarde demais, sem trilha histórica dos primeiros meses.
8. CORS aberto demais "pra facilitar o dev" e nunca revisitado.
9. Migrations destrutivas aplicadas direto em produção sem padrão expand/contract.
10. Tratar observabilidade como "depois eu adiciono" — instrumentar depois é ordens de magnitude mais caro.

### 4. Versão enxuta de 30 dias (time pequeno)

- **Semana 1**: Fase 0 completa + metade da Fase 1 (modelo de dados + login básico sem refresh rotativo ainda).
- **Semana 2**: Fase 1 completa (BFF, cookie httpOnly, tenant context, RLS) + início da Fase 2 (Role/Permission sem cache ainda).
- **Semana 3**: Fase 2 completa (guard + cache Redis) + Fase 3 reduzida (audit log direto, sem dashboard completo — só logs estruturados com correlation-id).
- **Semana 4**: Fase 4 reduzida ao checklist **obrigatório** apenas (rate limit, headers, validação de isolamento) + documentação mínima de arquitetura (Fase 5 fica só o essencial: README de "como adicionar um módulo novo").

Corte consciente nos 30 dias: ABAC, SSO enterprise, dashboards ricos de observabilidade e billing ficam explicitamente fora — é o roadmap pós-v1 (seção 11), não risco escondido.
