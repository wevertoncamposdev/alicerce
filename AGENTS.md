# AGENTS.md — Alicerce

> Fonte única de verdade para qualquer agente de IA que trabalhe neste repositório
> (Claude Code, GitHub Copilot agent mode, Codex, Cursor, Gemini CLI).
> Leia este arquivo inteiro antes de qualquer tarefa. Ele vale mais do que qualquer
> padrão encontrado no código ou no repositório de referência.

---

## 1. Intenção final (o "porquê" de tudo)

O Alicerce é um **template completo de aplicação SaaS multi-tenant**. O objetivo é que
uma ideia nova vire produto rodando pensando **apenas nas funcionalidades do domínio**.

Tudo o que se repete em toda aplicação já vem resolvido, testado e documentado:

| Camada | Já vem pronto |
| --- | --- |
| Fundação | Auth (login, registro, refresh, logout, esqueci/redefinir senha, convite), multi-tenant, RBAC, auditoria, usuários, perfil, configurações do tenant |
| API | NestJS padronizado: CRUD + search tenant-scoped, DTOs, erros, paginação/ordenação/filtros no servidor, OpenAPI |
| Interface | Shell de app, TypeView (list/cards/kanban/calendar), DetailView com autosave, RelationShell, MetaData (contexto + auditoria), campos de formulário ricos, filtros avançados |
| Sustentação | Analytics, gestão (back-office/super admin), feedback, suporte, notificações, e-mail, arquivos, feature flags |
| Receita | Cobrança: planos, assinaturas, doações, pagamentos avulsos, faturas, webhooks, entitlements (limites por plano) |
| Operação | Docker, CI/CD, seeds, observabilidade, atualização contínua da stack |

**Critério de pronto do template:** criar um módulo novo de domínio exige só
`npm run new:module <nome>`, editar o model Prisma, os campos e as colunas — e
**zero** novas primitivas de UI, zero código de auth, zero código de tenant.

**Princípio "um mecanismo para tudo":** toda entidade segue o mesmo fluxo de UX:
`TypeView (lista) → DetailView (form com autosave + RelationShell + MetaData)`.

---

## 2. Stack

- **Frontend:** Next.js (App Router, Server Components first) · React · TypeScript · Tailwind CSS · shadcn/ui · TanStack Table
- **Backend:** NestJS com adapter **Fastify** · Prisma (generator `prisma-client`, `moduleFormat = "cjs"`, adapter `@prisma/adapter-pg`) · PostgreSQL
- **Infra:** Docker Compose (dev), GitHub Actions (CI), Node LTS ativo

Estrutura do repositório:

```bash
backend/        NestJS + Prisma
  src/core/     infraestrutura transversal (auth, tenancy, authorization, audit, prisma, ...)
  src/platform/ módulos de plataforma plugáveis (billing, analytics, support, ...)
  src/modules/  módulos de domínio da aplicação
frontend/
  src/core/     motor de UI (registry, data-provider, screens, views, forms, shells)
  src/components/ui/  shadcn (não editar à mão sem motivo)
  src/platform/ telas dos módulos de plataforma
  src/modules/  módulos de domínio
  src/app/      rotas finas (só chamam screens)
docs/           ADRs, guias, roadmap
.reference/     clone somente-leitura do system_development (gitignored)
```

---

## 3. Decisões base (restrições duras — nunca violar)

### 3.1 Server-side first

1. **Server Components buscam dados chamando `apiServer` diretamente.** Não criar Route Handlers locais (`app/api/.../route.ts`) para leitura. As únicas Route Handlers permitidas são as de auth e o proxy BFF para chamadas originadas no browser.
2. `apiServer` é `server-only` (lê cookies via `next/headers`). Nunca importar em Client Component.
3. **Mutações via Server Actions** que chamam o `DataProvider`. O `DataProvider` é o **único caminho de escrita**.
4. `"use client"` só em ilhas interativas (inputs, tabela, drawer, autosave). Página, screen e layout são Server Components. Meta: < 35% dos arquivos com `"use client"`, e nenhum Server Component sem fetch real virando client por comodidade.
5. **`ColumnDef` com `cell` não atravessa a fronteira Server→Client.** Cada módulo tem seu wrapper `"use client"` (`<Module>ListView.tsx`) que importa as próprias colunas.
6. **Deduplicação de requisições no servidor usa `cache()` do React** (escopo por requisição). Nunca `Map` em escopo de módulo — isso compartilha dados entre usuários.
7. **Refresh de sessão acontece no `proxy.ts`**, antes do render (Server Components não gravam cookies). O `apiServer` nunca tenta refresh.
8. Server Actions de autosave **não chamam `revalidatePath`**.
9. Estado de lista (busca, página, ordenação, filtros, view) vive **na URL**, serializado por módulo. Paginação e ordenação são **sempre no servidor**.

### 3.2 Backend

 1. `tenantId` vem **sempre** do contexto autenticado (`@TenantId()` / request-context). Nunca do body, nunca de header confiado sem validar contra o JWT.
 2. Toda consulta a entidade tenant-scoped filtra por `tenantId` (e `deletedAt: null` quando houver soft delete) — inclusive `findOne`, `update`, `remove`. Usar o service base / extensão Prisma que aplica isso por padrão.
 3. `include` do Prisma sempre com `select` — nunca vazar campos sensíveis (`password`, tokens).
 4. Erros de negócio usam exceções HTTP do Nest (`NotFoundException`, `ForbiddenException`...). Nunca `throw new Error()` em service (vira 500).
 5. Permissões seguem a convenção `<recurso>.<ação>` (`favorite.read`, `billing.manage`) e são declaradas em um catálogo central que alimenta o seed.
 6. Middleware e guards usam tipos do **Fastify**, não do Express.
 7. Segredos nunca entram no repositório. `.env.example` só contém placeholders.

### 3.3 Taxonomia de entidades (decide a estrutura)

| Tipo | Definição | Onde vive | Na UI |
| --- | --- | --- | --- |
| Módulo | entidade independente com rotas próprias | `modules/<nome>/` | TypeView + DetailView |
| Módulo Relacionado | pivô N:N | entre dois módulos | RelationShell |
| Feature | sub-recurso 1:N com cascade delete | `modules/<pai>/features/<feature>/` | aba/tabela no DetailView do pai |
| Extensão de Módulo | complemento 1:1 | dentro do módulo pai | seção/aba no DetailView do pai |

Antes de criar qualquer entidade, **classifique-a** e diga a classificação na resposta.

### 3.4 Fronteiras de import (verificadas por lint)

- `core/` nunca importa de `modules/` nem de `platform/`.
- `platform/` pode importar de `core/`, nunca de `modules/`.
- `modules/` importa de `core/` e `platform/`, e de outro módulo só via contrato público (`index.ts`).
- Nada de domínio dentro de `core/` (o erro estrutural do `system_development`).

---

## 4. Repositório de referência: `system_development`

O `system_development` (github.com/TerceiroGestor/system_development) é um produto real
com muitos componentes prontos. Ele é **fonte de ideias e de componentes**, nunca de
arquitetura. Ele usa padrões que o Alicerce rejeita.

### 4.1 Quando consultar

Consulte a referência **somente** quando a tarefa envolver algo que o Alicerce ainda não
tem e a tabela 4.3 indicar que existe lá. Para o resto, o código do Alicerce é a verdade.

### 4.2 Como consultar

```bash
node scripts/reference.mjs          # clona ou atualiza em .reference/system_development
node scripts/reference.mjs --where  # mostra o caminho e o commit atual
```

A pasta `.reference/` é **somente leitura** e está no `.gitignore`. Nunca editar, nunca
importar arquivo de lá, nunca commitar.

### 4.3 Mapa de portabilidade

| Necessidade | Onde está na referência | Como trazer |
| --- | --- | --- |
| Campos de formulário (money, cpf, phone, date, date_range, boolean, select/multiselect, tags, file/image, richtext, color) | `frontend/src/web-client/forms/` (`types.ts`, `field-renderers.tsx`, `RecordForm.tsx`) | Portar tipos e renderers para `frontend/src/core/forms/`. Form segue com autosave via Server Action |
| Filtros avançados (domain) | `web-client/domain/` (`conditions`, `evaluate`, `serialize`), `web-client/filtering/` | Serializar o domain na URL; avaliar **no backend** (traduzir para `where` do Prisma), não no browser |
| Views extras (kanban, calendário, timeline, gantt, lista agrupada) | `web-client/views/` | Ilha client recebendo dados já buscados no servidor |
| Paginação, view switcher, filtros, favoritos de busca | `web-client/ui/PaginationBar.tsx`, `control-panel/` | Trocar `localStorage` por estado na URL / preferências salvas no backend |
| DetailShell completo (abas, side tabs, comentários, notas, tags, mídia) | `web-client/detail/` | Manter a composição; trocar hooks de fetch client por props vindas do Server Component |
| Starter de módulo e smoke test | `web-client/starter/` | Base para o gerador `new:module` |
| Request context (requestId, IP, user-agent) | `backend/src/core/request-context/` | Portar para Fastify (AsyncLocalStorage) |
| Rate limit | `backend/src/core/rate-limit/` | Aplicar em login, registro, reset de senha e webhooks |
| E-mail com templates | `backend/src/core/email/` | Abstrair provider (SMTP/Resend) atrás de interface |
| Upload de arquivos | `backend/src/core/files/` | Abstrair storage (local/S3/GCS) atrás de interface |
| Criptografia de PII | `backend/src/core/pii/` | Portar como está, com testes |
| Guard de permissões separado | `backend/src/core/authorization/` | Comparar com o `RolesPermissionsGuard` e manter o mais simples |

### 4.4 Tradução obrigatória ao portar

| Padrão na referência | Padrão no Alicerce |
| --- | --- |
| JWT em `localStorage`, `auth-context` client | Cookies httpOnly + refresh no `proxy.ts` + sessão resolvida no servidor |
| `useEffect` + fetch no client | Server Component com `apiServer` + props para a ilha client |
| Arquivos de domínio dentro de `web-client/` | Domínio só em `modules/` |
| Estado em `localStorage` (`usePersistedUrlState`, `favorites-storage`) | URL ou preferência persistida no backend |
| Tipos Express em middleware | Tipos Fastify |

Nomes equivalentes: TypeView = `views/*View.tsx` + `ViewSwitcher` · PainelSearchShell =
`SearchBar` + `PageControlPanel` · DetailShell = `DetailShellEngine` · MetaDataShell =
`StandardDetailMetadataSide` · RelationShell = `RelationListHost` + `DetailRelationTablePanel` ·
FormView = `RecordForm`.

### 4.5 Processo de portar um componente

1. Ler o componente e suas dependências na referência. Listar o que ele usa de domínio, de `localStorage` e de fetch client.
2. Escrever no relatório: o que será mantido, o que será traduzido (tabela 4.4) e o que será descartado.
3. Implementar em `core/` (ou `platform/`) sem nenhum nome de domínio.
4. Usar no módulo de exemplo (`examples`) para provar que funciona.
5. Checkpoint (seção 7).

---

## 5. Plataforma plugável (o que sustenta qualquer produto)

### 5.1 Contrato de módulo plugável

Todo módulo — de plataforma ou de domínio — se descreve por um manifesto:

```ts
// <backend|frontend>/src/<platform|modules>/<nome>/module.manifest.ts
export const manifest = defineModuleManifest({
  key: "support",                       // único
  kind: "platform",                     // "platform" | "domain"
  permissions: ["support.read", "support.reply", "support.manage"],
  entitlements: ["support.priority"],   // opcional: liberado por plano
  nav: { label: "Suporte", icon: "life-buoy", href: "/support", permission: "support.read" },
  dependsOn: ["notifications"],
});
```

Um arquivo `alicerce.config.ts` na raiz liga/desliga os módulos de plataforma. Desligar um
módulo remove rotas, navegação, permissões do seed e jobs — sem editar código do core.

### 5.2 Módulos de plataforma (todos plugáveis)

| Módulo | Escopo mínimo |
| --- | --- |
| `notifications` | in-app + e-mail, preferências por usuário, fila de envio |
| `files` | upload, storage abstrato, vínculo com qualquer entidade |
| `analytics` | eventos de produto gravados no servidor (`track()` no backend e Server Actions), métricas por tenant, dashboard; integração opcional com PostHog/Umami via adapter |
| `management` | back-office do dono da plataforma (super admin): tenants, usuários, planos, uso, impersonação auditada, feature flags |
| `feedback` | widget in-app, NPS/CSAT, sugestões com votos, status (recebido → planejado → entregue) |
| `support` | tickets com mensagens, anexos, prioridade, SLA, atribuição, base de conhecimento simples |
| `announcements` | changelog e avisos in-app por tenant/plano |
| `billing` | ver 5.3 |

### 5.3 Cobrança (`billing`)

- **Entidades:** `Plan`, `Price` (mensal/anual, moeda), `Subscription`, `Invoice`, `Payment`, `Donation`, `Customer` (vínculo tenant ↔ gateway), `WebhookEvent`.
- **Modalidades:** assinatura recorrente, doação (única ou recorrente, com valor livre e página pública de doação), pagamento avulso, trial, cupom.
- **Gateways atrás de interface** `PaymentProvider` (`createCustomer`, `createCheckout`, `createSubscription`, `cancel`, `parseWebhook`). Adapters: Stripe (cartão internacional), Mercado Pago ou Asaas (PIX, boleto, cartão no Brasil). Nenhum código fora do adapter conhece o gateway.
- **Webhooks:** assinatura verificada, idempotência por `WebhookEvent.externalId`, processamento transacional, reprocessamento manual pelo `management`.
- **Entitlements:** o plano define limites e recursos (`maxUsers`, `support.priority`). Backend verifica com `@RequiresEntitlement()`; frontend esconde/indica upgrade. O domínio nunca pergunta "qual é o plano", só "tem o entitlement?".
- **Segurança:** nunca armazenar dados de cartão; o checkout é sempre do gateway. Valores em centavos (`Int`), nunca `Float`.
- Ambientes de teste dos gateways configurados por env; seed com planos de exemplo.

---

## 6. Manutenção da stack (atualização contínua)

### 6.1 Política

- **Patch e minor:** aplicar mensalmente via Dependabot (agrupado), após CI verde.
- **Major:** uma por vez, em branch `chore/upgrade-<pacote>-<versão>`, nunca junto com feature.
- **Node:** sempre o LTS ativo em `.nvmrc`, `engines` e no CI. Atualizar quando o LTS mudar.
- Antes de qualquer upgrade, **consultar a versão estável atual** (`npm view <pacote> version`) e as notas de release oficiais. Não confiar em versões lembradas.

### 6.2 Roteiro por pacote

| Pacote | Como atualizar | O que verificar |
| --- | --- | --- |
| **Next.js + React** | `npx @next/codemod@latest upgrade latest` no `frontend/`; ler o guia de upgrade da versão | `proxy.ts`/middleware, APIs assíncronas (`cookies`, `headers`, `params`, `searchParams`), cache e revalidação, `next.config`, eslint-config-next na mesma versão |
| **Prisma** | atualizar `prisma`, `@prisma/client` e `@prisma/adapter-pg` **juntos** na mesma versão; `npx prisma generate`; ler o upgrade guide | generator `prisma-client` + `moduleFormat`, `prisma.config.ts`, migrations aplicam do zero em banco limpo |
| **NestJS** | todos os `@nestjs/*` na mesma major (`npx npm-check-updates "/^@nestjs/" -u`); `@fastify/*` compatíveis com o `fastify` do adapter | bootstrap, plugins Fastify (cookie, cors, helmet), Swagger, testes e2e |
| **TypeScript** | atualizar nos dois projetos ao mesmo tempo | `tsc --noEmit` limpo nos dois |
| **Tailwind + shadcn** | `npx shadcn@latest diff` para ver mudanças nos componentes; atualizar Tailwind conforme guia | componentes em `components/ui` sem edições locais perdidas |
| **ESLint / Prettier / Jest** | atualizar em grupo | lint e testes sem regressão |

### 6.3 Checklist de upgrade (todo upgrade passa por ele)

1. Branch dedicada, uma major por vez.
2. Ler changelog/breaking changes e anotar no PR o que se aplica ao Alicerce.
3. Rodar codemods oficiais quando existirem.
4. `npm ci` limpo → checkpoint completo (seção 7) → subir o Docker e testar login, CRUD do `examples`, refresh de sessão e um webhook de billing em modo teste.
5. Registrar no `CHANGELOG.md` e, se mudou alguma decisão, em um ADR.

---

## 7. Método de trabalho

### 7.1 Ciclo de cada tarefa

1. **Entender:** ler os arquivos envolvidos no Alicerce. Classificar entidades (3.3). Se precisar da referência, seguir a seção 4.
2. **Planejar:** listar passos pequenos, cada um commitável sozinho. Para tarefas grandes, apresentar o plano e esperar aprovação.
3. **Explicar o porquê:** cada decisão vem com a justificativa (o desenvolvedor está aprendendo o "porquê", não só o código). Explicar conceito, tecnologias envolvidas, decisão de arquitetura, código e como testar.
4. **Implementar** um passo por vez.
5. **Checkpoint** após cada passo:

   ```bash
   cd backend  && npx tsc --noEmit && npm run lint && npm test
   cd frontend && npx tsc --noEmit && npm run lint && npm run build
   ```

   Se algo falhar, corrigir antes de seguir. Nunca desabilitar regra de lint ou teste para passar.
6. **Commit** com Conventional Commits (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`, `build`, `perf`, `style`), escopo pelo módulo: `feat(billing): add webhook idempotency`.
7. **Relatório final** curto: o que mudou, como testar, pendências.

### 7.2 Proibido

- Inventar padrão novo quando já existe um no core.
- Copiar arquivo da referência sem passar pela tradução 4.4.
- Adicionar dependência sem dizer por quê e sem checar se o core já resolve.
- Colocar nome de domínio dentro de `core/` ou `platform/`.
- Commitar `.env`, segredos, `.reference/` ou o client gerado do Prisma.

### 7.3 Documentação

- Decisões estruturais viram ADR em `docs/adr/NNNN-titulo.md`.
- Cada fase concluída gera `docs/fases/fase-N-<nome>.md` com conceito, decisões, código e teste.
- O guia `docs/guia-novo-modulo.md` é mantido em dia: é o manual de uso do template.

---

## 8. Roadmap

Cada fase só começa quando a anterior passou no checkpoint. Marque `[x]` ao concluir.

### Fase 0 — Segurança e sessão (bloqueadores)

- [ ] Refresh no `proxy.ts`: ler JWT `exp`, renovar antes de expirar, gravar cookies no request e no response; cookie de refresh com `path=/`; `session_token` com validade do refresh (quem expira é o JWT)
- [ ] Corrigir `/api/auth/login` e `/api/auth/refresh` do Next: o Nest envia o refresh só por `Set-Cookie` (ler com `headers.getSetCookie()`)
- [ ] Janela de tolerância (alguns segundos) na detecção de reuso de refresh token, para requisições paralelas
- [ ] `RolesService.findOne/update/remove` filtrando por `tenantId`
- [ ] `TenantController`: guard de permissão; `SEARCH` e `DELETE` só para `management`
- [ ] `TenantMiddleware` reescrito com tipos Fastify e testado contra token de outro tenant
- [ ] Remover `JWT_SECRET` real do `.env.example`; trocar o segredo
- [ ] Decidir unicidade de `User.email` (global ou por tenant) e alinhar o schema
- [ ] `FavoritesService`: `NotFoundException` em vez de `Error`
- [ ] Auditoria: nome da entidade consistente entre interceptor e frontend
- [ ] Testes e2e: login → expirar token → navegar; acesso cruzado entre tenants retorna 403/404

### Fase 1 — Ferramentas

- [ ] Corrigir `frontend/eslint.config.mjs` (objeto `rules` estava dentro de `globalIgnores`) e ativar as fronteiras da seção 3.4
- [ ] Zerar lint do backend (`--fix` + correções manuais); `tsc` dos specs limpo
- [ ] CI: Node LTS, `tsc` + lint + testes + build nos dois projetos, e2e com Postgres em service container
- [ ] `.nvmrc`, `engines`, Dependabot agrupado, `docker-compose.yml` (Postgres), `.env.example` nos dois projetos

### Fase 2 — Limpeza para template

- [ ] Remover domínio do schema (Tenant de ONG, board, Person, Address, Contact, Report, Task); Tenant base enxuto
- [ ] Migrations recriadas do zero; seed com tenant, admin e catálogo de permissões
- [ ] `src/core/prisma/generated/` fora do git (gerado no `postinstall`)
- [ ] Apagar código morto (rodar `npx knip`)
- [ ] Unificar `components/shells`, `components/DetailView`, `components/Layout` em `core/`
- [ ] `favorites` + `notes` viram o módulo de exemplo canônico `examples` (Módulo + Feature)

### Fase 3 — Contrato de módulo

- [ ] Backend: service base tenant-scoped (ou extensão Prisma), helper `search` (whitelist de sort/filtros), padrão único de pastas
- [ ] Frontend: `createRestDataHandlers(resource)`; módulo declara só campos, colunas, views e layout de detalhe
- [ ] Paginação e ordenação no servidor (remover `getPaginationRowModel` client-side)
- [ ] `cache()` do React no data-provider; remover `Map`s de módulo
- [ ] `defineModuleManifest` + `alicerce.config.ts`

### Fase 4 — Gerador

- [ ] `npm run new:module <nome> [--feature-of <pai>]` cria: model Prisma, módulo Nest, permissões no catálogo, rotas finas, contract, ListView wrapper, registro no bootstrap, teste smoke
- [ ] Validar criando um módulo novo do zero só com o gerador

### Fase 5 — Componentes portados da referência

- [ ] Campos de formulário ricos
- [ ] Filtros avançados com avaliação no backend
- [ ] Views: kanban, calendário, lista agrupada, timeline
- [ ] `loading.tsx`, `error.tsx`, `not-found.tsx`, empty states, toast, diálogo de confirmação
- [ ] Seletor de tenant, i18n consistente, tema claro/escuro

### Fase 6 — Core de plataforma

- [ ] request-context, rate-limit, validação de env (zod), logger estruturado, health check
- [ ] Auditoria com before/after real
- [ ] `files`, `notifications`, e-mail
- [ ] Esqueci/redefinir senha, convite de usuário, perfil

### Fase 7 — Sustentação

- [ ] `management` (super admin, feature flags, impersonação auditada)
- [ ] `analytics`
- [ ] `feedback`
- [ ] `support`
- [ ] `announcements`

### Fase 8 — Cobrança

- [ ] Entidades e `PaymentProvider`
- [ ] Adapter Stripe e adapter PIX/boleto (Mercado Pago ou Asaas)
- [ ] Assinaturas, trial, cupom, cancelamento
- [ ] Doações (página pública, valor livre, recorrente)
- [ ] Webhooks idempotentes + reprocessamento
- [ ] Entitlements no backend e frontend

### Fase 9 — Produto "template"

- [ ] Repositório marcado como GitHub Template
- [ ] `npm run init:app` (renomeia projeto, gera segredos, escolhe módulos de plataforma no `alicerce.config.ts`)
- [ ] `docs/guia-novo-modulo.md` e `docs/guia-nova-aplicacao.md` testados por alguém que não escreveu o código
- [ ] Deploy de referência documentado (Render ou GCP)

---

## 9. Como começar uma sessão

1. Ler este arquivo.
2. Ver o roadmap (seção 8) e identificar a primeira caixa não marcada, ou a tarefa pedida.
3. Rodar o checkpoint para conhecer o estado atual.
4. Se a tarefa envolve algo da tabela 4.3, rodar `node scripts/reference.mjs` e seguir 4.5.
5. Apresentar o plano da tarefa antes de editar arquivos.
