# 1 Estratégia de gestão no GitHub (visão geral)

**Fluxo fim a fim:** `Idea → Issue → Branch → PR → Review → Merge → Release`

1. Ideia/demanda entra como **Issue** (nunca direto como código).
2. Issue é refinada (DoR), estimada, priorizada no **Project**, associada a um **Milestone**.
3. Dev cria **branch** a partir de `develop` seguindo convenção, com commits **Conventional Commits**.
4. Abre **PR** (draft se incompleto), vinculado à Issue (`Closes #123`).
5. CI roda automaticamente (lint/test/build/security). Reviewer aprova conforme política de CODEOWNERS.
6. Merge (squash) → Issue fecha automaticamente → Project move para "Done".
7. Releases são cortadas de `develop` → `release/*` → `main`, com tag SemVer e changelog gerado.

**Papéis:**

| Papel | Responsabilidade |
| --- | --- |
| Tech Lead | Define arquitetura, aprova PRs críticos (auth/tenant/rbac), gerencia milestones/releases |
| Dev | Implementa issues, abre PRs pequenos, escreve testes |
| Reviewer | Garante qualidade, segurança e aderência ao padrão; pode ser peer dev |
| QA | Valida critérios de aceite, testes E2E/isolamento de tenant antes de merge em `release/*` |
| DevOps | Mantém pipelines, secrets, ambientes, monitora deploy e rollback |

---

## 2 Estrutura inicial do repositório

**Branches:**

- `main` — sempre deployável em produção, protegida, só recebe merge de `release/*` ou `hotfix/*`.
- `develop` — integração contínua, base de features.
- `release/x.y.0` — estabilização pré-release (bugfix only, sem feature nova).
- `hotfix/x.y.z` — correção emergencial a partir de `main`.
- `feature/*`, `fix/*`, `chore/*`, `security/*` — a partir de `develop`.

**Proteção de branch (main e develop):**

- Exigir PR (sem push direto), mínimo 1–2 aprovações (2 para `main`/áreas críticas).
- Exigir status checks obrigatórios (CI, security scan) passando.
- Exigir branch atualizada antes do merge (`up to date with base`).
- Exigir assinatura de commits (GPG/SSH) em `main`.
- Bloquear force-push e deleção de branch.
- Conversation resolution obrigatória antes do merge.

**Regra de merge — recomendação: Squash merge** para `feature/*` → `develop` (histórico limpo, 1 commit por PR); **Merge commit** para `release/*` → `main` (preserva rastreabilidade da release). Rebase evitado por padrão (risco de reescrever histórico compartilhado).

**Nomenclatura de branch:** `tipo/escopo-curto-descricao` (kebab-case, minúsculas)

```bash
feature/auth-refresh-token-rotation
fix/tenant-context-leak-on-logout
chore/ci-cache-pnpm
security/rls-policy-users-table
```

**Conventional Commits:**

```bash
feat(auth): implementar rotação de refresh token
fix(tenancy): corrigir vazamento de tenant_id em query de tasks
chore(ci): adicionar cache de dependências no pipeline
docs(architecture): atualizar diagrama de multitenancy
test(rbac): adicionar teste de isolamento entre tenants
refactor(audit): extrair interceptor de log de eventos sensíveis
perf(permission-cache): reduzir TTL de cache Redis
security(jwt): validar tenant_id do claim antes do decode do payload
build(deps): atualizar prisma para 5.20
revert: reverter "feat(auth): rotação de refresh token"
```

---

## 3 GitHub Projects (modelo pronto)

**Tipo recomendado:** GitHub Projects (v2, org-level), pois permite campos customizados, múltiplas views (board/table/roadmap) e automação nativa via workflows — superior a um Project clássico.

**Colunas (Status):** `Backlog → Ready → In Progress → In Review → Blocked → Done`

**Campos customizados:**

- `Prioridade` (P0–P3)
- `Esforço` (S/M/L ou Story Points 1-2-3-5-8)
- `Risco` (Baixo/Médio/Alto — ex.: mudanças em RLS/auth são Alto)
- `Módulo` (Auth, Tenancy, RBAC, Audit, Observability, Frontend-Core, Infra)
- `Tipo` (Epic/Feature/Story/Task/Bug/Chore/Security)
- `Sprint` (iteration field, 2 semanas)

**Automations recomendadas:**

- Issue criada → entra em `Backlog` automaticamente.
- PR aberto vinculado a Issue → Issue move para `In Review`.
- PR mergeado → Issue fecha e move para `Done`.
- Label `blocked` aplicada → move automaticamente para `Blocked`.
- Issue atribuída → move para `In Progress`.

**Conexão automática:** usar "Auto-add to project" (workflow do Project) filtrando por repo/label, e `Closes #N` no corpo do PR para fechar issues automaticamente no merge.

---

## 4 Milestones e roadmap

Alinhado às fases da arquitetura (ver architecture.md):

| Milestone | Objetivo | Entrada | Saída |
| --- | --- | --- | --- |
| M0 – Foundation | Esqueleto técnico funcionando | Repo criado | `docker compose up` ok, CI verde, health-check ok |
| M1 – Auth + Tenant | Login e contexto multitenant fim a fim | M0 fechado | Login persiste sessão, isolamento básico testado |
| M2 – RBAC | Autorização granular com cache | M1 fechado | 403 correto, cache Redis com invalidação |
| M3 – Audit + Observability | Rastreabilidade e correlação | M2 fechado | Evento de auditoria consultável, traces ativos |
| M4 – Hardening | Segurança endurecida | M3 fechado | Checklist obrigatório 100% |
| M5 – Template + DX | Reuso e documentação | M4 fechado | Clonar → rodar em < 30 min |

**Medição de progresso:** usar a aba "Insights" do Project (burndown por iteration field), e progress bar nativa do Milestone (Issues fechadas/abertas). Cycle time via query GraphQL/API exportada para dashboard, se necessário.

---

## 5 Estratégia de Issues (granularidade ideal)

**Tipos e template (campos obrigatórios):**

| Tipo | Uso | Campos obrigatórios |
| --- | --- | --- |
| Epic | Agrupador de um domínio inteiro (ex.: "RBAC") | Objetivo, escopo, lista de features filhas, milestone |
| Feature | Entrega de valor visível | Contexto, critérios de aceite, dependências |
| Story | Fatia vertical de feature | Persona/cenário, critérios de aceite (Gherkin opcional) |
| Task | Trabalho técnico sem valor direto ao usuário | Descrição técnica, definição de pronto |
| Bug | Defeito | Passos para reproduzir, esperado vs. atual, severidade |
| Chore | Manutenção (deps, config) | Motivo, impacto |
| Security | Vulnerabilidade/hardening | Severidade (CVSS se aplicável), componente afetado, plano de mitigação |

**Quebra da arquitetura em issues pequenas:** cada bounded context (`iam/auth`, `iam/rbac`, `tenancy`, `audit`, `infra/observability`) vira 1 Epic; cada entrega da tabela de fases (seção 2 do architecture.md) vira Features; cada Feature quebra em Stories/Tasks de no máximo 1–2 dias de trabalho (regra: se não cabe em um PR revisável em <30min, quebrar mais).

**DoR (Definition of Ready):** critérios de aceite escritos, dependências identificadas, estimativa definida, sem bloqueio técnico desconhecido.

**DoD (Definition of Done):** código + testes + lint/CI verde + documentação atualizada + revisado e aprovado + sem TODO de segurança pendente.

**Dependências:** usar "Blocked by #N" no corpo da issue + label `blocked`, e task-lists do GitHub para Epic→Feature→Story (checkbox linkado fecha automaticamente o pai quando todos os filhos fecham).

---

## 6 Estratégia de Pull Requests

**Tamanho ideal:** até ~300–400 linhas de diff (excluindo lockfiles/gerados). Se maior, quebrar em PRs incrementais (ex.: schema → service → controller → testes).

**Checklist obrigatório de PR:**

- [ ] Testes unitários/integração adicionados ou atualizados
- [ ] Nenhuma query sem filtro de `tenant_id` (se aplicável)
- [ ] Secrets não commitados / sem hardcode
- [ ] Migração de banco revisada (expand/contract, reversível)
- [ ] Logs/observabilidade adicionados para ações sensíveis
- [ ] Documentação atualizada (README/architecture, se aplicável)
- [ ] Sem `console.log`/debug esquecido

**Política de review:** mínimo 1 aprovação para módulos comuns; **2 aprovações obrigatórias** (uma de CODEOWNER) para mudanças em `auth`, `tenancy`, `rbac`, `audit`, migrations e configs de CI/CD. Nenhum PR pode ser aprovado pelo próprio autor.

**Draft PR:** usar sempre que o trabalho está em andamento mas já quer feedback antecipado de direção ou disparar CI cedo; converter para "Ready for review" só quando checklist estiver completo.

**Evitar PRs gigantes:** feature flags para código incremental, PRs "stacked" (um sobre o outro), e regra de time: se estimativa > 1 dia, quebrar issue antes de codar.

---

## 7 Labels e taxonomia

| Categoria | Labels | Cor sugerida |
| --- | --- | --- |
| Tipo | `epic`, `feature`, `story`, `task`, `bug`, `chore`, `security` | tons de azul/roxo |
| Prioridade | `P0-critical`, `P1-high`, `P2-medium`, `P3-low` | vermelho→verde |
| Status | `blocked`, `needs-review`, `needs-info`, `wontfix` | amarelo/cinza |
| Área | `area:auth`, `area:tenancy`, `area:rbac`, `area:audit`, `area:observability`, `area:frontend`, `area:infra` | tons por módulo |
| Risco | `risk:high`, `risk:medium`, `risk:low` | vermelho/laranja/verde |
| Segurança | `security:vulnerability`, `security:hardening` | vermelho escuro |
| Tenant | `tenant-isolation` (marca qualquer issue/PR que toque isolamento multitenant, para auditoria fácil) | roxo |

Nomenclatura: `categoria:valor` em minúsculas com hífen. Usar labels para gerar relatórios via filtros salvos no Project (ex.: view "Segurança em aberto" = `security:*` + status ≠ Done).

---

## 8 CODEOWNERS e governança

```bash
# .github/CODEOWNERS
/backend/src/core/auth/            @org/auth-owners
/backend/src/core/common/tenancy/  @org/tenancy-owners
/backend/src/modules/audit/        @org/audit-owners
/backend/prisma/                   @org/backend-leads
/.github/workflows/                @org/devops
/frontend/lib/session.ts           @org/auth-owners
/frontend/lib/authz.ts             @org/auth-owners
*                                   @org/tech-leads
```

**Regras:** branch protection exige aprovação de CODEOWNERS para os paths acima antes do merge em `main`/`develop`. Mudanças em `auth`, `tenancy`, `rbac`, `audit`, migrations ou workflows de CI **sempre** exigem revisão de um Tech Lead, mesmo com outras aprovações. Mudanças sensíveis (rotação de secrets, RLS, política de permissão) exigem issue própria com label `security:hardening` documentando motivo e rollback plan.

---

## 9 CI/CD com GitHub Actions (plano completo)

**Workflows mínimos:**

1. **CI** (`ci.yml`) — trigger em PR: lint → type-check → unit tests → build (backend e frontend em jobs paralelos/matrix).
2. **Security scan** (`security.yml`) — trigger em PR + schedule semanal: `npm audit`/Dependabot, secret scanning (GitHub Advanced Security ou Gitleaks), SAST (Semgrep/CodeQL).
3. **PR checks** — required status checks combinando CI + security + conventional-commit lint (commitlint) + tamanho de PR (aviso se >400 linhas).
4. **Release** (`release.yml`) — trigger em merge para `main`: gera changelog (Conventional Commits → semantic-release), cria tag SemVer, publica release notes.
5. **Deploy** (`deploy-dev.yml`, `deploy-staging.yml`, `deploy-prod.yml`) — dev automático em merge para `develop`; staging automático em `release/*`; prod manual (environment protection com approval) em merge para `main`.

**Quality gates por branch:** `feature/*` → CI básico; `develop`/`release/*` → CI + security scan obrigatórios; `main` → todos os checks + aprovação manual de deploy em ambiente `production` (Environments do GitHub com required reviewers).

**Cache:** cache de `node_modules`/pnpm store por lockfile hash, cache de build do Next.js (`.next/cache`), cache de camadas Docker se houver build de imagem.

**Versionamento:** SemVer estrito (`MAJOR.MINOR.PATCH`), automatizado via semantic-release lendo Conventional Commits (`fix` → patch, `feat` → minor, `BREAKING CHANGE`/`!` → major).

---

## 10 Plano de execução por fases (MVP → v1)

### Fase 0 — Foundation

- **Objetivo:** esqueleto técnico compartilhado.
- **Issues:** setup monorepo, CI básico, Docker Compose, lint/commitlint/husky, OTel SDK inicial.
- **Aceite:** `docker compose up` sobe tudo; CI verde; health-check responde.
- **Riscos:** escolha errada de ferramenta cedo.
- **Branch/PR:** `chore/ci-base-pipeline` → PR "chore(ci): configurar pipeline base de lint/test/build"

### Fase 1 — Auth + Tenant Context

- **Issues:** endpoints login/refresh/logout, BFF Route Handlers, tenancy middleware, RLS setup.
- **Aceite:** login persiste sessão; teste de isolamento básico (2 tenants) passa.
- **Riscos:** RLS mal configurado degradando performance.
- **Branch/PR:** `feature/auth-login-refresh-cookie` → PR "feat(auth): implementar login com cookie httpOnly e refresh"

### Fase 2 — RBAC

- **Issues:** entidades Role/Permission, guard de permissão, cache Redis, UI de gestão de roles.
- **Aceite:** endpoint sensível bloqueia sem permissão; invalidação de cache <1 request.
- **Riscos:** sobre-engenharia prematura de ABAC.
- **Branch/PR:** `feature/rbac-permission-guard` → PR "feat(rbac): adicionar guard de permissão com cache Redis"

### Fase 3 — Audit + Observabilidade

- **Issues:** audit interceptor, tabela `audit_event`, correlation-id, dashboards mínimos.
- **Aceite:** ação sensível gera evento consultável com quem/quando/tenant.
- **Riscos:** log excessivo virando ruído/custo.
- **Branch/PR:** `feature/audit-interceptor-events` → PR "feat(audit): registrar eventos sensíveis com correlation-id"

### Fase 4 — Hardening

- **Issues:** rate limiting, headers de segurança, rotação de refresh, testes de isolamento automatizados.
- **Aceite:** checklist obrigatório da seção 7 do architecture.md 100%.
- **Riscos:** quebrar fluxo já construído.
- **Branch/PR:** `security/rate-limit-auth-endpoints` → PR "security(auth): adicionar rate limiting em login/refresh"

### Fase 5 — Template + DX

- **Issues:** script de scaffold, documentação de arquitetura, exemplo de domínio de referência.
- **Aceite:** clonar→rodar com login+RBAC+audit em <30 min.
- **Riscos:** template genérico demais.
- **Branch/PR:** `chore/scaffold-new-module-script` → PR "chore(dx): adicionar script de scaffold de módulo de domínio"

---

## 11 Operação diária do time (ritual de execução)

**Cadência semanal:**

- Segunda: Planning assíncrono — revisar Project board, mover issues `Ready → In Progress`, confirmar capacidade.
- Diário: Daily assíncrono via comentário em uma Issue fixa "Daily Standup" ou thread no Project (o que fiz, o que farei, bloqueios).
- Quinta/Sexta: Review de PRs pendentes em bloco (revisão em lote reduz lead time).
- Sexta: Retro assíncrona — issue de retro com labels `retro`, coletando o que travou (referenciar issues `blocked`).

**Métricas de fluxo:** Lead time (criação da Issue → merge), Cycle time (In Progress → Done), Throughput (issues fechadas/semana), PR review time (aberto → primeira revisão), Change failure rate (hotfixes/deploys com rollback).

**Detecção de gargalos:** se `In Review` acumula, priorizar revisão antes de nova feature; se muitas issues em `Blocked`, revisar dependências no planning; PR review time alto → reduzir tamanho de PR e aumentar frequência de revisão em lote.

---

## 12 Segurança e compliance no processo

- **Branch protection:** required checks (CI + security scan), aprovações mínimas (2 em áreas críticas), commits assinados obrigatórios em `main`, sem force-push.
- **Assinatura de commits:** exigir GPG/SSH signing verificado em `main`/`release/*`.
- **Secret protection:** GitHub Secret Scanning + push protection habilitados; Dependabot (security updates + version updates) semanal.
- **Fluxo de incidente/hotfix:** `hotfix/x.y.z` a partir de `main` → PR com 2 aprovações expressas (pode reduzir SLA de review, nunca o número de aprovadores) → merge em `main` e `develop` simultaneamente → release patch imediata.
- **Auditoria de mudanças:** histórico de aprovações fica nativo no PR (quem aprovou, quando); usar `audit_event` da aplicação para mudanças de dado, e GitHub Audit Log (org-level) para mudanças de permissão/config do repositório.

---

## 13 Entrega final acionável

## 1. Tabela de milestones completas

| Milestone | Objetivo | Issues macro | Prazo sugerido | Critério de saída |
| --- | --- | --- | --- | --- |
| M0 – Foundation | Esqueleto técnico | Setup repo, CI, Docker, OTel base | Semana 1 | CI verde, ambiente sobe local |
| M1 – Auth + Tenant | Login e contexto multitenant | Auth endpoints, BFF, RLS | Semana 2–3 | Isolamento básico testado |
| M2 – RBAC | Autorização granular | Role/Permission, guard, cache | Semana 4 | 403 correto, cache invalidando |
| M3 – Audit + Observability | Rastreabilidade | Interceptor, correlation-id, dashboards | Semana 5 | Evento auditável consultável |
| M4 – Hardening | Segurança endurecida | Rate limit, headers, testes isolamento | Semana 6 | Checklist obrigatório 100% |
| M5 – Template + DX | Reuso do template | Scaffold, docs, exemplo domínio | Semana 7 | Clone→run <30min |

## 2. Backlog inicial (40 issues)

| # | Título | Tipo | Prioridade | Milestone | Label | Estimativa |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Setup monorepo com lint/commitlint/husky | Task | P1 | M0 | area:infra | S |
| 2 | Configurar Docker Compose (db, redis, api, front) | Task | P0 | M0 | area:infra | M |
| 3 | Configurar pipeline CI base (lint/test/build) | Task | P0 | M0 | area:infra | M |
| 4 | Adicionar OpenTelemetry SDK básico | Task | P2 | M0 | area:observability | S |
| 5 | Criar health-check endpoint | Task | P2 | M0 | area:infra | S |
| 6 | Modelar entidades Tenant/User/Membership (Prisma) | Feature | P0 | M1 | area:tenancy | M |
| 7 | Implementar endpoint de login (Nest) | Feature | P0 | M1 | area:auth | M |
| 8 | Implementar emissão de access + refresh token | Feature | P0 | M1 | area:auth | M |
| 9 | Implementar endpoint de refresh com rotação | Feature | P0 | M1 | area:auth | L |
| 10 | Implementar logout com revogação de refresh token | Feature | P1 | M1 | area:auth | S |
| 11 | Criar Route Handlers de BFF (login/logout/me) | Feature | P0 | M1 | area:frontend | M |
| 12 | Implementar cookie httpOnly no Next.js | Task | P0 | M1 | area:auth | S |
| 13 | Implementar Tenancy Middleware (AsyncLocalStorage) | Feature | P0 | M1 | area:tenancy | M |
| 14 | Configurar RLS no Postgres por tenant_id | Feature | P0 | M1 | area:tenancy,risk:high | L |
| 15 | Middleware de guard de rota (Next.js) | Feature | P1 | M1 | area:frontend | S |
| 16 | Teste de isolamento básico entre 2 tenants | Story | P0 | M1 | tenant-isolation | M |
| 17 | Modelar Role/Permission/RolePermission | Feature | P0 | M2 | area:rbac | M |
| 18 | Modelar MembershipRole | Feature | P0 | M2 | area:rbac | S |
| 19 | Implementar guard de permissão (Nest) | Feature | P0 | M2 | area:rbac | M |
| 20 | Implementar decorator @RequirePermission | Task | P1 | M2 | area:rbac | S |
| 21 | Implementar cache Redis de permissões | Feature | P1 | M2 | area:rbac | M |
| 22 | Implementar invalidação ativa de cache de permissão | Task | P0 | M2 | area:rbac,risk:high | M |
| 23 | UI mínima de gestão de roles (frontend) | Feature | P2 | M2 | area:frontend | L |
| 24 | Documentar matriz de roles x permissions | Chore | P2 | M2 | area:rbac | S |
| 25 | Teste de acesso negado (403) sem permissão | Story | P0 | M2 | area:rbac | S |
| 26 | Implementar audit interceptor (Nest) | Feature | P0 | M3 | area:audit | M |
| 27 | Criar tabela/entidade audit_event | Task | P0 | M3 | area:audit | S |
| 28 | Propagar correlation-id front→API→logs | Feature | P1 | M3 | area:observability | M |
| 29 | Instrumentar traces OpenTelemetry (spans customizados) | Task | P2 | M3 | area:observability | M |
| 30 | Criar dashboard mínimo (latência/erro/login falho) | Task | P2 | M3 | area:observability | M |
| 31 | Listar e implementar eventos auditáveis críticos | Story | P1 | M3 | area:audit | M |
| 32 | Implementar rate limiting em login/refresh | Security | P0 | M4 | security:hardening | M |
| 33 | Configurar headers de segurança (CSP, HSTS, etc.) | Security | P0 | M4 | security:hardening | M |
| 34 | Implementar detecção de reuso de refresh token | Security | P0 | M4 | security:hardening,risk:high | L |
| 35 | Revisar política de CORS | Security | P1 | M4 | security:hardening | S |
| 36 | Configurar dependency scan no CI (Dependabot) | Task | P1 | M4 | area:infra | S |
| 37 | Escrever testes automatizados de isolamento de tenant | Story | P0 | M4 | tenant-isolation | L |
| 38 | Escrever testes de escalonamento de privilégio | Story | P0 | M4 | security:hardening | M |
| 39 | Criar script de scaffold de novo módulo de domínio | Task | P2 | M5 | area:infra | M |
| 40 | Documentar "como adicionar módulo novo" (README) | Chore | P2 | M5 | area:infra | S |

## 3. Exemplos de nomes de branches

```bash
feature/auth-login-refresh-cookie
feature/tenancy-context-middleware
feature/rbac-permission-guard
feature/audit-event-interceptor
fix/tenant-context-leak-on-logout
fix/refresh-token-reuse-detection
security/rate-limit-auth-endpoints
security/csp-headers-hardening
chore/ci-cache-pnpm-store
chore/scaffold-new-module-script
```

## 4. Exemplos de commits convencionais

```bash
feat(auth): implementar login com emissão de access e refresh token
feat(tenancy): adicionar middleware de contexto de tenant via AsyncLocalStorage
fix(rbac): corrigir invalidação de cache Redis ao remover role
security(auth): adicionar detecção de reuso de refresh token
feat(audit): registrar audit_event com correlation-id
chore(ci): adicionar cache de pnpm store no workflow
docs(architecture): atualizar matriz de roles e permissions
test(tenancy): adicionar teste de isolamento entre dois tenants
refactor(rbac): extrair guard de permissão para decorator reutilizável
perf(observability): reduzir amostragem de traces em produção
```

## 5. Exemplo de PR template completo

```markdown
## Descrição
<!-- O que este PR faz e por quê -->

## Issue relacionada
Closes #

## Tipo de mudança
- [ ] feat
- [ ] fix
- [ ] chore
- [ ] security
- [ ] refactor

## Checklist obrigatório
- [ ] Testes unitários/integração adicionados ou atualizados
- [ ] Nenhuma query sem filtro de `tenant_id` (se aplicável)
- [ ] Sem secrets/credenciais hardcoded
- [ ] Migração de banco revisada (padrão expand/contract)
- [ ] Logs/auditoria adicionados para ações sensíveis
- [ ] Documentação atualizada (se aplicável)
- [ ] Sem `console.log`/debug esquecido

## Áreas afetadas
- [ ] auth
- [ ] tenancy
- [ ] rbac
- [ ] audit
- [ ] frontend
- [ ] infra/CI

## Como testar
<!-- Passos para validar manualmente -->

## Screenshots (se UI)
```

## 6. Exemplo de Issue template (Feature)

```markdown
---
name: Feature
about: Nova entrega de valor para o produto
labels: feature
---

## Contexto
<!-- Por que essa feature é necessária, referência ao architecture.md se aplicável -->

## Objetivo
<!-- O que deve ser entregue -->

## Critérios de aceite
- [ ] 
- [ ] 
- [ ] 

## Dependências
Blocked by: #

## Módulo afetado
- [ ] auth
- [ ] tenancy
- [ ] rbac
- [ ] audit
- [ ] frontend
- [ ] infra

## Risco
- [ ] Baixo
- [ ] Médio
- [ ] Alto (justificar)

## Estimativa
S / M / L
```

## 7. Checklist de bootstrap do repositório (ordem exata)

1. Criar repositório e configurar `main`/`develop` como branches padrão.
2. Adicionar .gitignore, README.md, `LICENSE`.
3. Configurar branch protection rules em `main` e `develop`.
4. Criar `.github/CODEOWNERS`.
5. Criar templates de Issue (`.github/ISSUE_TEMPLATE/*.md`) e PR (pull_request_template.md).
6. Criar labels iniciais via script/API (tipo, prioridade, área, risco, segurança, tenant).
7. Criar GitHub Project (v2) com campos customizados e views.
8. Criar Milestones M0–M5.
9. Configurar Dependabot (`.github/dependabot.yml`) para deps e security updates.
10. Habilitar Secret Scanning + Push Protection nas configurações do repo.
11. Configurar workflow de CI (`ci.yml`).
12. Configurar workflow de security scan (`security.yml`).
13. Configurar commitlint + husky (hook local de commit-msg).
14. Configurar workflow de release (`release.yml`) com semantic-release.
15. Configurar Environments (dev/staging/production) com required reviewers em prod.
16. Configurar workflows de deploy por ambiente.
17. Popular backlog inicial (40 issues da seção 2) e associar a milestones.
18. Comunicar ao time o fluxo Idea→Issue→Branch→PR→Review→Merge→Release e ritual semanal.
