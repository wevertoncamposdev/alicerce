# Alicerce — Fase 12: Endurecimento

> Origem: revisão do `develop` em 2026-10-25 (commit 95c159b), feita com
> Postgres + RLS + Redis reais e Chrome headless sobre o build de produção.
> O checkpoint passava inteiro; as falhas abaixo só aparecem fora dos mocks.
>
> **Regra de execução:** igual à do `Plano Base.md` — 1 branch curta por etapa,
> plan mode antes de editar, checkpoint completo, Conventional Commits. Toda
> etapa que toca `core/` cita o ADR 0013.
>
> **Regra extra desta fase (teste primeiro):** cada correção começa
> escrevendo o teste que reproduz a falha **e falha hoje**. Na 12.1 esses
> testes entram como `it.failing(...)`; a etapa que corrige troca para
> `it(...)`. Uma correção sem o teste virando verde não está pronta.
>
> Checkpoint desta fase (Node 26, `nvm use`):
>
> ```bash
> cd backend  && npx tsc --noEmit && npm run lint && npm test && npm run test:e2e && npm run test:e2e:db
> cd frontend && npx tsc --noEmit && npm run lint && npm test && npm run build && npm run test:smoke
> ```

## Visão geral

| Etapa | Corrige | Quando | Toca `core/` |
| --- | --- | --- | --- |
| 12.0 ADR 0013 | — | Antes de tudo | Não (só docs) |
| 12.1 Rede de testes reais | Lacuna dos mocks | Bloqueia deploy | Não |
| 12.2 CSP com nonce | C1 | Bloqueia deploy | Não |
| 12.3 Campo `image` serializável | C2 | Bloqueia deploy | Sim (`registry/types.ts`) |
| 12.4 Auditoria das rotas públicas | C3 | Bloqueia deploy | Não (`modules/audit`) |
| 12.5 Tolerância do refresh só na rotação | C4 | Bloqueia deploy | Sim (`core/auth`) |
| 12.6 Compose, CI e onboarding | I4 | Bloqueia deploy | Não |
| 12.7 IP e navegador reais no backend | I1 | Antes do 1º cliente | Sim (`main.ts`, `core/auth`) |
| 12.8 Sessão atual no perfil | I2 | Antes do 1º cliente | Sim (`core/auth`) |
| 12.9 E-mail sem diferenciar caixa | I3 | Antes do 1º cliente | Sim (`core/auth`, `core/common`) |
| 12.10 Limpezas | Menores | Antes do 1º cliente | Pontual |
| 12.11 Sessão de plataforma revogável | Management | Antes de abrir o management | Sim (`core/platform-auth`) |
| 12.12 Suspensão de tenant imediata | Management | Antes de abrir o management | Sim (`core/authorization`) |
| 12.13 Escala horizontal | — | Só com 2+ réplicas | Sim |

**Base pronta para deploy = 12.0–12.6. Pronta para o 1º cliente = 12.0–12.10.**

Dependências: 12.1 vem antes de todas. 12.2 torna todas as páginas
dinâmicas, o que a 12.7 aproveita (`headers()` em toda requisição). As demais
são independentes entre si.

---

## 12.0 ADR 0013 — Endurecimento da base

- Registrar que a base sai do congelamento para a Fase 12, com o escopo de
  arquivos de `core/` de cada etapa (coluna "Toca `core/`" + os arquivos
  listados em cada etapa abaixo).
- Registrar as duas decisões de arquitetura novas da fase:
  1. **CSP com nonce ⇒ todas as páginas renderizam dinamicamente** (perde-se
     a pré-renderização estática de `/auth/login`, `/auth/register`,
     `/platform/login`, `/termos`, `/auth/forgot-password`). Em troca, o
     redirect de usuário já logado para fora do login passa a funcionar
     (pendência registrada no `PLAN.md` de 2026-10-25).
  2. **O access token passa a carregar `sid`** (o `familyId` da sessão) para o
     backend saber qual é a sessão atual sem depender do cookie de refresh.
- Atualizar `CLAUDE.md` (lista de ADRs por fase) e `PLAN.md`.
- **Aceite:** documento revisado; nenhuma mudança de código.

---

## 12.1 Rede de testes reais

Hoje 23 dos 26 `*.e2e-spec.ts` usam `MockPrisma`: não passam por RLS,
transação, constraint nem Redis. Esta etapa cria as duas redes que teriam
pego as falhas críticas.

### Backend — e2e contra Postgres real

- Nova pasta `backend/test-db/`, config `test-db/jest-e2e-db.json`, script
  `npm run test:e2e:db`. Sobe o `AppModule` inteiro (Fastify + cookies +
  `ValidationPipe` iguais ao `main.ts` — extrair a configuração do app para
  uma função `configureApp(app)` reutilizada pelo `main.ts` e pelos testes).
- Banco: `DATABASE_URL`/`APP_DATABASE_URL` apontando para um banco de teste
  (`alicerce_test`); `globalSetup` roda `prisma migrate reset --force
  --skip-seed` e `syncPermissionCatalog`. Redis real (`REDIS_URL`), com
  `FLUSHDB` entre arquivos.
- `MAIL_DRIVER=console` + um helper que lê o último token emitido (convite,
  reset, verificação) por um provider de teste que guarda os e-mails em
  memória — não pelo log.
- Throttler: desligar via env só nesta suíte (`THROTTLE_DISABLED=true`,
  lido no `ThrottlerModule.forRootAsync`), exceto no arquivo que testa o
  próprio throttle.
- Helpers: `registerTenant()`, `login()`, `inviteAndAccept()`,
  `refreshWith(cookie)` em `test-db/helpers.ts`.

Cenários (os marcados ✗ falham hoje e entram como `it.failing`):

| Arquivo | Cenário | Hoje |
| --- | --- | --- |
| `isolation.db-spec.ts` | B não lê, não lista (`SEARCH`), não altera feedback de A | ✓ |
| `isolation.db-spec.ts` | Role `app_runtime` sem `app.tenant_id` vê 0 linhas | ✓ |
| `rbac.db-spec.ts` | Papel com `feedback.read` lê feedbacks e leva 403 em `/roles`; marcar `role.read` vale sem novo login | ✓ |
| `audit.db-spec.ts` | Login certo grava `LOGIN`; senha errada grava `LOGIN_FAILED` | ✗ (12.4) |
| `audit.db-spec.ts` | Conta bloqueada grava `LOGIN_FAILED` com `reason: account_locked` | ✗ (12.4) |
| `audit.db-spec.ts` | Nenhum registro contém `password`, tokens ou a senha em claro | ✓ |
| `sessions.db-spec.ts` | Encerrar sessão → refresh imediato com o cookie dela → 401 | ✗ (12.5) |
| `sessions.db-spec.ts` | Trocar senha → refresh imediato de outra sessão → 401 | ✗ (12.5) |
| `sessions.db-spec.ts` | Duas renovações paralelas do mesmo cookie (corrida de abas) → ambas 200 | ✓ |
| `sessions.db-spec.ts` | Reset de senha e desativação derrubam todas as sessões | ✓ |
| `email.db-spec.ts` | Cadastro com e-mail em maiúsculas de uma conta existente → 409 | ✗ (12.9) |
| `email.db-spec.ts` | Login com outra caixa funciona | ✗ (12.9) |
| `validation.db-spec.ts` | `GET /roles/nao-e-uuid` → 400 | ✗ (12.10) |
| `lockout.db-spec.ts` | 5 falhas → senha certa recusada; chave expira ≤ 900 s | ✓ |

### Frontend — smoke no build de produção

- Adicionar `@playwright/test` (devDependency; motivo: é a única forma de
  ver CSP e erros de Server→Client, que `curl` e vitest não enxergam).
- `frontend/e2e/smoke.spec.ts`, script `npm run test:smoke`, rodando contra
  `next build && next start` com o backend real.
- Para cada rota do menu (lida do `alicerce.config.ts`, não de uma lista
  manual) + `/perfil` + `/configuracoes/instituicao` + um Detail de cada
  módulo:
  - falha se o corpo contém "Algo deu errado";
  - falha se o console tem `Content Security Policy` ou `Refused to execute`;
  - falha se houver `pageerror`;
  - em 375×812, falha se `scrollWidth > 375`.
- Login feito **pela tela**, não injetando cookie — é o que pega a CSP.
- Hoje este smoke falha em C1, C2 e `/roles` a 375 px; entra marcado com
  `test.fail()` nesses casos.

### CI

- `backend-checks` e `frontend-checks` sem mudança de comando, mas com
  `DATABASE_URL` definido no job (o `postinstall` do Prisma exige — até a 12.6).
- Novo job `backend-e2e-db`: services `postgres` + `redis`, env completo
  (`APP_DATABASE_URL`, `PLATFORM_JWT_SECRET`, `COOKIE_SECRET`), roda
  `test:e2e:db`. Criar a role `app_runtime` antes (mesmo SQL do `docs/deploy.md` §4).
- Novo job `frontend-smoke`: sobe backend + front de produção, `npx playwright
  install --with-deps chromium`, roda `test:smoke`, sobe screenshots como artifact.

**Aceite:** os dois comandos rodam local e no CI; os ✓ passam; os ✗ estão
como `it.failing`/`test.fail()` e o relatório lista cada um com a etapa que o corrige.

---

## 12.2 CSP com nonce (C1)

**Hoje:** `next.config.ts` manda `script-src 'self'` em produção; o Next injeta
`<script>` inline (`self.__next_f.push`) sem nonce; o Chrome bloqueia e o
React não hidrata.

Seguir o guia do próprio Next em
`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`
(seção "Adding a nonce with Proxy"):

- `frontend/proxy.ts`: gerar nonce por requisição (`crypto.randomUUID()` →
  base64), montar a CSP com
  `script-src 'self' 'nonce-<n>' 'strict-dynamic'` (+ `'unsafe-eval'` só em dev),
  setar `Content-Security-Policy` na resposta **e** no request (`x-nonce` +
  CSP) para o Next aplicar o nonce nos próprios scripts. Manter toda a lógica
  de redirect atual.
- `matcher` do proxy: excluir `api`, `_next/static`, `_next/image`,
  `favicon.ico` e prefetches, como no guia.
- `next.config.ts`: tirar a CSP de `headers()` (fica no proxy); manter
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. Conservar a
  inclusão do host do Sentry em `connect-src`.
- `app/layout.tsx`: forçar renderização dinâmica (`await connection()` ou
  `export const dynamic = "force-dynamic"`, o que o guia desta versão indicar).
- Com as páginas de auth dinâmicas, o redirect "logado em `/auth/login` →
  `/dashboard`" e "logado em `/platform/login` → `/platform/tenants`" do proxy
  passa a funcionar — cobrir no smoke.
- **Aceite:** smoke sem nenhuma violação de CSP em todas as rotas; login pela
  tela funciona; `curl -I` mostra nonce diferente a cada requisição;
  usuário logado que abre `/auth/login` vai para `/dashboard`.

---

## 12.3 Campo `image` serializável (C2)

**Hoje:** `FormFieldConfig.previewUrl` é uma função; o contrato (Server) a
entrega ao `FormView` (Client) e o React derruba `/perfil` e
`/configuracoes/instituicao` em produção.

- `frontend/src/core/registry/types.ts` (ADR 0013): trocar
  `previewUrl?: (record: T) => string | null | undefined` por
  `previewField?: keyof T & string` — o nome do campo do registro que já traz
  a URL resolvida pelo backend.
- `components/TypeView/FormView/FormView.tsx`: ler
  `record[field.previewField]` (string) em vez de chamar a função.
- Contratos: `modules/perfil/config/contract.tsx` →
  `previewField: "avatarUrl"`; `modules/instituicao/config/contract.tsx` →
  `previewField: "logoUrl"`.
- Teste de regressão (vitest) `core/registry/serializable-contracts.test.ts`:
  percorre todos os módulos registrados no `bootstrap.ts` e falha se qualquer
  valor dentro de `formFields` for função. Assim a classe inteira de erro
  "função atravessando a fronteira" fica coberta para módulos futuros.
- Atualizar `docs/adr/0010-storage.md` (nota) e `docs/guia-novo-modulo.md`.
- **Aceite:** smoke sem "Algo deu errado" em `/perfil` e
  `/configuracoes/instituicao`; upload de avatar e logo mostra o preview;
  teste de contratos serializáveis verde.

---

## 12.4 Auditoria das rotas públicas (C3)

**Hoje:** `AuditService.register` grava com `PrismaService` (role
`app_runtime`, RLS). Em rotas `@Public()` não há tenant no
`AsyncLocalStorage` e o Postgres recusa: `new row violates row-level
security policy for table "audits"`. Login, falha de login, bloqueio,
cadastro, reset e aceite de convite não ficam auditados.

- `backend/src/modules/audit/audit.service.ts`: envolver o `create` em
  `runWithTenantContext(tenantId, …)` (helper que já existe em
  `core/common/context/request-context.ts` e já é usado pelo
  `PermissionCacheService`). Como o `tenantId` vem do próprio usuário
  encontrado, a RLS continua garantindo que o registro cai no tenant certo.
- Nos `void this.auditService.register(...).catch(() => {})` do
  `AuthService`: trocar o `catch` vazio por `this.logger.error(...)` (criar o `Logger` na classe; regra da 1.5).
- Conferir se cadastro (`/auth/register`) e aceite de convite também ficam
  auditados pelo `AuditInterceptor` depois da correção.
- **Aceite:** testes `audit.db-spec.ts` verdes; após login certo e errado
  existem linhas `LOGIN` e `LOGIN_FAILED` no Postgres; nenhum
  `violates row-level security` no log da suíte.

---

## 12.5 Tolerância do refresh só na rotação (C4)

**Hoje:** `refreshTokens` aceita um token já revogado por até 10 s
(`REFRESH_TOKEN_REUSE_GRACE_MS`) para tolerar duas abas renovando ao mesmo
tempo. Mas a mesma tolerância vale para tokens revogados por "encerrar
sessão", "trocar senha" e "encerrar as outras" — dá para ressuscitar a sessão
e a cadeia nova fica válida indefinidamente.

- `prisma/models/auth/auth.prisma`: `RefreshToken.replacedAt DateTime?` +
  migration `refresh_token_replaced_at`.
- `core/auth/auth.service.ts` (ADR 0013):
  - na rotação, gravar `revokedAt` **e** `replacedAt`;
  - tolerância só se `replacedAt !== null` **e** dentro da janela;
  - token revogado sem `replacedAt` (revogação de segurança) → 401 sempre,
    e revoga a família inteira (tratado como reuso).
- `session-revocation.util.ts` não muda (continua gravando só `revokedAt`).
- Testes unitários do `auth.service.spec.ts` para os três casos + os de
  `sessions.db-spec.ts`.
- **Aceite:** encerrar sessão + refresh imediato com o cookie dela → 401;
  trocar senha + refresh imediato de outra sessão → 401; duas renovações
  paralelas do mesmo cookie continuam 200.

---

## 12.6 Compose, CI e onboarding (I4)

**Hoje:** `docker compose up` derruba o backend (falta `PLATFORM_JWT_SECRET`,
exigido pelo `env.schema.ts`); o compose diz que o backend aplica migrations,
mas o `Dockerfile` não roda `migrate deploy`; `npm ci` do backend falha sem
`.env` porque o `postinstall` roda `prisma generate`, que exige `DATABASE_URL`.

- `backend/prisma.config.ts`: `DATABASE_URL` opcional para comandos que não
  conectam (`generate`) — ler `process.env.DATABASE_URL` com fallback em vez de
  `env()`, que lança. Assim `npm ci` funciona num clone limpo e no CI.
- `docker-compose.yml`:
  - `PLATFORM_JWT_SECRET: ${PLATFORM_JWT_SECRET:-dev-only-change-me-too}` no backend;
  - serviço `migrate` de execução única (estágio de build do `Dockerfile`, que
    tem o CLI do Prisma) rodando `migrate deploy` + `sync:permissions`; o
    backend depende dele com `condition: service_completed_successfully`;
  - corrigir o comentário sobre a role `app_runtime` (em dev ela vem da
    migration; em produção, ver `docs/deploy.md` §4).
- `.env.example` da raiz: incluir `PLATFORM_JWT_SECRET`.
- `backend/test/SETUP.md`: reescrever (hoje descreve o "Projeto Study").
- README: deixar explícito `nvm use` (Node 26); em Node 22 o Jest falha inteiro.
- **Aceite:** clone limpo → `cp .env.example .env && docker compose up` →
  `GET /api/health` ok e login com o usuário do seed; `npm ci` do backend sem
  `.env` funciona.

---

## 12.7 IP e navegador reais no backend (I1)

**Hoje:** login, cadastro, reset etc. são chamados **pelo servidor Next**, sem
`X-Forwarded-For`/`User-Agent` do browser. O Nest grava sessões como
`127.0.0.1 | node` e o throttle de 5 req/min por IP vira um limite
**compartilhado por todos os usuários** (o 6º login do minuto, de qualquer
pessoa, leva 429). E `trustProxy: true` confia em `X-Forwarded-For` de qualquer
origem.

Frontend:

- Novo `frontend/src/lib/upstream-headers.ts` (`server-only`):
  `getClientForwardHeaders()` lê `headers()` da requisição do browser e devolve
  `{ "X-Forwarded-For": <ip do cliente>, "User-Agent": <ua do browser> }`.
  IP: primeiro de `x-forwarded-for` quando o Next estiver atrás de um proxy
  confiável (configurável), senão `x-real-ip`/endereço da conexão.
- Usar em **todas** as chamadas do servidor Next ao Nest: `lib/auth-login.ts`,
  `auth-forgot-password.ts`, `auth-reset-password.ts`, `auth-accept-invite.ts`,
  `platform-login.ts`, `platform-api-server.ts`, `api-server.ts` (`request` e
  `upload`) e os Route Handlers `app/api/auth/*/route.ts`.

Backend (ADR 0013):

- `main.ts`: `trustProxy` lido de `TRUST_PROXY` (ex.: `127.0.0.1,10.0.0.0/8`),
  default `loopback` — nunca `true`. Documentar em `.env.example` e `docs/deploy.md`.
- Login: throttle por IP continua; o bloqueio por conta (1.6) já cobre ataques
  distribuídos a uma mesma conta.
- **Aceite:** login pela tela grava IP e `User-Agent` do browser na sessão;
  6 logins de clientes diferentes no mesmo minuto não levam 429; uma
  requisição direta ao Nest com `X-Forwarded-For` forjado, vinda de fora de
  `TRUST_PROXY`, é contada pelo IP real.

---

## 12.8 Sessão atual no perfil (I2)

**Hoje:** o cookie `refresh_token` tem `path=/api/auth` e não chega à Server
Action de `/perfil`. Sem ele o backend não sabe qual é a sessão atual: "trocar
senha" e "encerrar as outras" revogam **também** a atual (o usuário cai em até
15 min) e a lista não mostra "(sessão atual)".

- `core/auth/auth.service.ts` (ADR 0013): `signToken` inclui `sid`
  (= `familyId`) no JWT, no login e no refresh. Tipos do payload/`AuthUserContext`
  ganham `sid`.
- `core/auth/me.service.ts` e `me.controller.ts`: usar `req.user.sid` em vez do
  cookie para `isCurrent`, `changePassword` e `revokeOtherSessions`. Token antigo
  sem `sid` (até 15 min após o deploy): comportamento atual.
- Frontend: remover o repasse manual do cookie em
  `modules/perfil/config/password-action.ts` e `sessions-provider.ts`.
- **Aceite:** `/perfil` mostra "(sessão atual)"; trocar senha mantém a sessão
  atual viva e derruba as outras; "encerrar as outras" idem.

---

## 12.9 E-mail sem diferenciar caixa (I3)

**Hoje:** sem normalização, `Fulano@x.com` e `fulano@x.com` viram duas contas e
o login com outra caixa falha.

- `core/common/validators/normalize-email.decorator.ts`: `@NormalizeEmail()`
  (`@Transform` com `trim().toLowerCase()`; o `ValidationPipe` já roda com
  `transform: true`).
- Aplicar em todos os DTOs com `@IsEmail()`: `sign-in`, `sign-up-public`,
  `forgot-password`, `change-my-email`, `platform-login`, `create-user`,
  `update-user`, `create-tenant`.
- Migration `normalize_emails`: (1) consulta que **aborta** se houver duplicatas
  por `lower(trim(email))` em `users` ou `platform_users`, listando-as;
  (2) `UPDATE … SET email = lower(trim(email))`; (3) `CHECK (email = lower(email))`
  nas duas tabelas, para nenhuma escrita futura escapar da regra.
- **Aceite:** testes `email.db-spec.ts` verdes; migration roda num banco com
  e-mails mistos e falha com mensagem clara se houver duplicata.

---

## 12.10 Limpezas

Cada item é um commit pequeno na mesma branch.

1. **`ParseUUIDPipe` nas rotas `:id`** — hoje `GET /roles/nao-e-uuid` dá 500
   (erro do Prisma). Aplicar em todos os controllers e no template do
   `scripts/new-module.mjs`. Aceite: 400.
2. **`tenantId` fora dos DTOs** (regra 4.2.1) — remover de `CreateUserDto` e
   `AttachRoleUserDto` (hoje ignorado, mas exigido) e dos chamadores no front.
3. **Concluir a 3.6 (`RoleType`)** — tornar opcional com default no
   `CreateRoleDto`, tirar a coluna "Tipo" de `/roles`; remover a coluna do
   banco quando nada mais ler.
4. **CNPJ alfanumérico** — `is-document.validator.ts` aceitar
   `^[A-Z0-9]{12}\d{2}$` com o cálculo de dígito por valor ASCII − 48
   (o numérico continua válido). Aceitar e normalizar máscara (`.`, `/`, `-`).
5. **`/develop` só em desenvolvimento** — `notFound()` quando
   `NODE_ENV === "production"` e item fora do menu.
6. **`/roles` a 375 px** — rolagem horizontal dentro do container da tabela
   (`components/TypeView/ListView`), não na página; corrigir também o título
   sobreposto pela busca no topbar.
7. **`/auth/register`** — página Server + formulário client (regra 4.1.4),
   como já é o login.

- **Aceite:** checkpoint verde; smoke a 375 px sem scroll lateral em nenhuma rota.

---

## 12.11 Sessão de plataforma revogável

**Hoje:** token de plataforma vale 8 h, sem logout no servidor; ações de
suspender/reativar só vão para o `Logger` (exceção da decisão 4 do ADR 0012).

- `PlatformUser.tokenVersion Int @default(0)` + claim `tv` no JWT; o guard
  recusa se `tv` ≠ `tokenVersion` (cacheado no Redis). `POST /platform-auth/logout`
  incrementa. TTL de 8 h → 1 h.
- Model `PlatformAudit` (fora do RLS de tenant, sem FK para `User`): ator,
  ação, tenant alvo, before/after. Suspender/reativar passam a gravar ali.
- **Aceite:** depois do logout o token antigo leva 401; suspender um tenant
  gera uma linha em `platform_audits`.

## 12.12 Suspensão de tenant imediata

**Hoje:** usuários de um tenant suspenso continuam usando o access token por
até 15 min (o desativado já leva 403; o tenant suspenso não).

- Ao suspender: revogar os refresh tokens do tenant e invalidar o cache de
  permissões de todos os usuários dele (`PermissionCacheService`).
- `RolesPermissionsGuard`: negar quando o status do tenant (cacheado junto com
  as permissões) não for `ACTIVE`.
- **Aceite:** suspender → a próxima requisição de qualquer usuário do tenant leva 403.

---

## 12.13 Escala horizontal (só quando houver 2+ réplicas)

Não fazer agora; registrar no `docs/roadmap.md`.

- Jobs `@Cron` com lock no Redis (`SET NX PX`) ou instância dedicada.
- Storage do Throttler no Redis (hoje em memória, por instância).
- MIME de upload validado pelos bytes do arquivo, não pelo header.

---

## Como pedir cada etapa ao Claude Code

Primeira sessão (12.0 + 12.1):

```text
Leia CLAUDE.md, AGENTS.md, "Plano Base.md" e docs/PLAN-fase-12.md.
Execute a etapa 12.0 (ADR 0013) e espere meu ok. Depois, execute a 12.1
em plan mode: crie a suíte test:e2e:db contra Postgres real e o smoke
Playwright no build de produção, com os cenários listados. Os cenários
marcados ✗ entram como it.failing / test.fail(). Ajuste o CI. Rode o
checkpoint da Fase 12, faça commits pequenos e termine com relatório
curto: o que mudou, quais testes falham hoje (esperado) e por quê.
```

Cada etapa seguinte:

```text
Leia CLAUDE.md, AGENTS.md e docs/PLAN-fase-12.md.
Execute a etapa 12.<N> — <título>. Comece em plan mode e espere meu ok.
Respeite o escopo de core/ do ADR 0013. Primeiro troque o it.failing /
test.fail() do cenário desta etapa por it/test e confirme que ele falha
pelo motivo descrito; depois corrija até ficar verde. Rode o checkpoint
da Fase 12, faça commit `<tipo>(<escopo>): ...` e termine com relatório
curto (o que mudou, como testar, pendências). Em mudança visual,
screenshots Playwright 1440 e 375.
```
