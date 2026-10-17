# REVISAO.md — Estado do planejamento e próximos passos (Alicerce)

> Gerado em 2026-10-17. Cruza `AGENTS.md` (roadmap de 9 fases), `PLAN.md`
> (backlog tático, blocos P0–P16 + Etapas 1–7), `docs/adr/*`,
> `docs/features/Completo/*` e `frontend/src/modules/develop/*` com o estado
> real do código (schema Prisma, pastas `backend/src/`, `frontend/src/`).
> Onde um documento e o código discordam, este arquivo registra qual dos dois
> está certo.

## 1. Estado por fase do roadmap (`AGENTS.md` §8)

| Fase | Status real | Notas |
| --- | --- | --- |
| **0 — Segurança e sessão** | ✅ quase completa | Só falta validação manual com navegador real (login → expirar token → navegar); refresh proativo foi decisão consciente de **não fazer** por ora (fica reativo via retry-on-401). |
| **1 — Ferramentas** | ✅ completa | Lint, CI, Dependabot, `.nvmrc`, docker-compose — tudo presente e confirmado no código. |
| **2 — Limpeza para template** | 🟡 parcial — roadmap desatualizado em 2 de 6 itens | Ver seção 2 abaixo. |
| **3 — Contrato de módulo** | ✅ completa | `findOneOrThrow`, `createRestDataHandlers`, paginação/ordenação no servidor, `cache()`, `defineModuleManifest` básico — todos confirmados (Etapa 7.C–7.F do `PLAN.md`). |
| **4 — Gerador** | ✅ completa | `npm run new:module` existe e foi validado ponta a ponta (Etapa 7.G, 2026-10-16). Só falta `--feature-of <pai>`, já documentado como próximo passo. |
| **5 — Componentes portados da referência** | ⬜ não iniciada | Confirmado: sem `core/forms/` de campos ricos, sem domain/filtros avançados, sem kanban/calendário/timeline, sem `loading.tsx`/`error.tsx`/`not-found.tsx`. Roadmap está correto. |
| **6 — Core de plataforma** | 🟡 parcial | request-context, rate-limit, validação de env, logger, health check e auditoria before/after: ✅ feitos. `files`, `notifications`, e-mail, esqueci/redefinir senha, convite de usuário: ⬜ nada existe. Roadmap está correto aqui. |
| **7 — Sustentação** | ⬜ não iniciada | Nenhuma pasta `backend/src/platform/` ou `frontend/src/platform/` existe ainda; nenhum de `management`/`analytics`/`feedback`/`support`/`announcements`. Roadmap correto. |
| **8 — Cobrança** | ⬜ não iniciada | Nenhuma entidade de billing (`Plan`/`Subscription`/`Invoice`/`Payment`/`Donation`) no schema. Roadmap correto. |
| **9 — Produto "template"** | ⬜ não iniciada | Nenhum `npm run init:app`, sem marcação de GitHub Template. Roadmap correto. |

## 2. Discrepâncias a corrigir no `AGENTS.md` (Fase 2)

O checkbox da Fase 2 lista 6 itens como pendentes (`[ ]`). Dois já estão
feitos e podem ser marcados `[x]`:

- **Remover domínio do schema** (Tenant de ONG, `Person`, `Address`,
  `Contact`, `Report`, `Task`) — **já feito**. `backend/prisma/models/main/tenant.prisma`
  contém só `Tenant`/`User`/`Role`/`UserRole`/`Permission`/`RolePermission`/
  `Audit`/`Example`/`ExampleNote`, com comentário explícito remetendo à
  `docs/adr/0003-tenant-generico.md`.
- **`src/core/prisma/generated/` fora do git** — **já feito**, confirmado na
  linha 58 do `.gitignore`.

Os outros 4 itens da Fase 2 **continuam pendentes de verdade** e devem seguir
`[ ]`:

- Migrations recriadas do zero com seed de tenant/admin/permissões (não
  verificado de forma isolada nesta revisão — recomenda-se confirmar).
- `npx knip` para apagar código morto remanescente.
- **Unificar `TypeView` dentro de `core/`**: hoje `ListView`/`CardsView`/
  `FormView`/`ViewSwitcher` ainda vivem em `frontend/src/components/TypeView/`,
  fora de `core/` — só `DetailView` e `Layout` já migraram.
- **Renomear `favorites`→`examples` no frontend**: o backend já fala
  `examples`/`example_notes` (`backend/src/modules/examples/`), mas o frontend
  ainda expõe o módulo como `favorites` (`frontend/src/modules/favorites/`).
  O módulo de exemplo canônico "Módulo + Feature" citado no `AGENTS.md` ainda
  não existe com esse nome no frontend.

## 3. Débito técnico transversal (já documentado no `PLAN.md`, consolidado aqui)

Estas pendências já estão registradas no `PLAN.md` — não são descobertas
novas, só reunidas para referência rápida:

1. **TypeScript 5.9→7.0** — bloqueado por `ts-jest`/`typescript-eslint`.
2. **Prisma 7→8** — bloqueado, CLI ainda em RC (`8.0.0-rc.23`).
3. **Majors sem data**: `react-intl` 10→12, `eslint`/`@eslint/js` 9→10,
   `@vitejs/plugin-react` 5→6, `react`/`react-dom` 19.2→19.3.
4. **`braces`/`fast-glob`** (devDependency, via shadcn/eslint-config-next) —
   sem correção segura disponível ainda.
5. **Refresh de sessão proativo** — decisão consciente de ficar reativo
   (retry-on-401) até o projeto tratar performance/edge runtime como tema
   próprio.
6. **Validação manual nunca executada** por falta de ferramenta na sessão:
   `docker compose up --build` real e cliques reais em navegador
   (Dialog/AlertDialog/Sheet/toast).
7. **`groupBy` do `SearchBaseDto`** — declarado mas não lido por nenhuma view
   ainda; só relevante quando a Fase 5 trouxer agrupamento.
8. **`--feature-of <pai>`** no gerador `new-module.mjs` — não implementado.
9. **Nenhum e2e exercita RLS contra Postgres real sem mock** — gap de rede de
   segurança automatizada, documentado como risco aberto no `PLAN.md` (Etapa
   7.D).

## 4. Lacunas de processo documental

- **`docs/fases/`** (prevista no `AGENTS.md` §7.3) nunca foi criada — o
  conteúdo equivalente foi depositado em `docs/features/Completo/` em vez
  disso, e cumpre o mesmo papel (conceito + decisões + código + teste por
  fase concluída).
- **`docs/guia-novo-modulo.md`** (também prevista no §7.3) nunca existiu como
  arquivo solto — o guia "como criar um módulo novo" vive dentro de
  `frontend/src/modules/develop/content/part3-modulos.tsx`.
- **Recomendação**: formalizar essa divergência no `AGENTS.md` §7.3 (apontar
  para `docs/features/Completo/` e para `/develop` em vez de prometer
  arquivos que nunca são criados), em vez de deixá-la implícita. É uma
  decisão pequena, não bloqueia nada.
- `frontend/src/modules/develop/` não é código morto — é documentação viva e
  majoritariamente atual. Único drift: `part1-fundamentos.tsx` ainda cita
  `lib/registry (getModule)`, que hoje mora em `frontend/src/core/registry/`.

## 5. Novo planejamento em etapas

Sequência acionável a partir de hoje, em ordem de dependência:

### Etapa A — Acerto de roadmap (sem código)
- Atualizar os 2 checkboxes da Fase 2 no `AGENTS.md` (seção 2 acima).
- Registrar no `AGENTS.md` §7.3 que `docs/fases/` foi substituída por
  `docs/features/Completo/` na prática, e que o guia de novo módulo vive em
  `/develop` (seção 4 acima).

### Etapa B — Fechar Fase 2 de fato
- Mover `TypeView` (ListView/CardsView/FormView/ViewSwitcher) para dentro de
  `core/`, junto de `DetailView` e `Layout`.
- Decidir e aplicar a nomenclatura final do módulo de exemplo no frontend
  (`favorites` → `examples`, espelhando o backend).
- Rodar `npx knip` e remover código morto encontrado.
- Confirmar que as migrations foram recriadas do zero com seed de
  tenant/admin/catálogo de permissões.

### Etapa C — Validação manual pendente (Etapa 6 do `PLAN.md`)
- Assim que houver ambiente com Docker disponível: `docker compose up --build`
  real.
- Assim que houver navegador disponível: testar cliques reais em
  Dialog/AlertDialog/Sheet/toast, e o fluxo "login → expirar token → navegar"
  da Fase 0.

### Etapa D — Resto da Fase 6 (core de plataforma)
- `files` (upload + storage abstrato), `notifications` (in-app + e-mail),
  e-mail com templates, esqueci/redefinir senha, convite de usuário, perfil.
- Nessa ordem porque as Fases 7–8 (support, billing) dependem de notificações
  e e-mail já existirem.

### Etapa E — Fase 5 (componentes portados da referência)
- Campos de formulário ricos, filtros avançados com avaliação no backend,
  views kanban/calendário/lista agrupada/timeline, `loading.tsx`/`error.tsx`/
  `not-found.tsx`, seletor de tenant, i18n, tema claro/escuro.
- Seguir o processo de portar da seção 4.5 do `AGENTS.md` (ler referência →
  relatório do que muda → implementar em `core/` sem nome de domínio → provar
  no módulo `examples` → checkpoint).

### Etapa F — Manifesto de módulo plugável completo
- Implementar `defineModuleManifest`/`alicerce.config.ts` como descrito na
  seção 5.1 do `AGENTS.md` (hoje só registra ícone/título/rota — falta
  `kind`, `permissions`, `entitlements`, `dependsOn`, toggle real de
  módulos).
- Pré-requisito para a Fase 7, que precisa de módulos de plataforma
  realmente plugáveis.

### Etapa G — Fase 7 (sustentação)
- `management`, `analytics`, `feedback`, `support`, `announcements`.
- Primeira vez que `backend/src/platform/` e `frontend/src/platform/` passam
  a existir.

### Etapa H — Fase 8 (cobrança)
- Entidades (`Plan`, `Price`, `Subscription`, `Invoice`, `Payment`,
  `Donation`, `Customer`, `WebhookEvent`) + interface `PaymentProvider`.
- Adapters Stripe e PIX/boleto (Mercado Pago ou Asaas).
- Assinaturas, trial, cupom, cancelamento, doações, webhooks idempotentes,
  entitlements no backend e frontend.

### Etapa I — Fase 9 (empacotamento como template)
- Marcar repositório como GitHub Template.
- `npm run init:app` (renomeia projeto, gera segredos, escolhe módulos de
  plataforma).
- Testar `docs/guia-novo-modulo.md`/`docs/guia-nova-aplicacao.md` (ou seus
  equivalentes em `/develop`) com alguém que não escreveu o código.
- Documentar deploy de referência (Render ou GCP).

### Monitoramento contínuo (recorrente, não é uma etapa única)
- Revisar periodicamente se TypeScript 7 e Prisma 8 saíram de RC e ficaram
  compatíveis com `ts-jest`/`typescript-eslint`.
- Revisar se `braces`/`fast-glob` resolveram via atualização do
  shadcn/eslint-config-next.
