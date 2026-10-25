# ADR 0013 — Endurecimento da base (Fase 12)

- Status: aceito
- Data: 2026-10-25
- Escopo: autoriza, fase a fase, exatamente os arquivos de `core/` listados
  em cada etapa do `docs/PLAN-fase-12.md` (coluna "Toca `core/`" da visão
  geral + corpo de cada etapa). Resumo das etapas que tocam `core/`:
  - 12.3 (campo `image` serializável): `frontend/src/core/registry/types.ts`.
  - 12.5 (tolerância do refresh): `backend/src/core/auth/auth.service.ts`,
    migration `refresh_token_replaced_at`.
  - 12.7 (IP/navegador reais): `backend/src/main.ts` (`trustProxy`); nenhum
    arquivo de `core/auth` muda de fato nesta etapa (o IP/UA já chegava até
    `AuthService` — o que faltava era o Next repassar os de verdade).
  - 12.8 (sessão atual no perfil): `backend/src/core/auth/auth.service.ts`
    (claim `sid`), `backend/src/core/auth/me.service.ts`,
    `backend/src/core/auth/me.controller.ts`.
  - 12.9 (e-mail sem diferenciar caixa):
    `backend/src/core/common/validators/normalize-email.decorator.ts`
    (novo), DTOs de `core/auth` e `core/platform-auth` (`sign-in`,
    `sign-up-public`, `forgot-password`, `change-my-email`,
    `platform-login`).
  - 12.11 (sessão de plataforma revogável): `backend/src/core/platform-auth/**`.
  - 12.12 (suspensão imediata de tenant): `backend/src/core/authorization/**`
    (`RolesPermissionsGuard`, `PermissionCacheService`).
  - 12.13 (escala horizontal): não fazer agora — só registrar no
    `docs/roadmap.md` (etapa explicitamente adiada).
  - Demais etapas (12.0, 12.1, 12.2, 12.4, 12.6, 12.10) não tocam `core/`
    (12.4 fica em `modules/audit`; 12.10 é pontual, caso a caso).
  - Nada além dessas listas em `core/` sem perguntar — se uma etapa, ao ser
    executada, precisar de um arquivo de `core/` fora desta lista, parar e
    perguntar antes de editar.

## Contexto

Todo o checkpoint de `Plano Base.md` (Fases 0–11) passa com `MockPrisma` em
23 dos 26 `*.e2e-spec.ts` do backend — sem RLS, sem transação real, sem
Redis, sem `main.ts` de verdade. Uma revisão do `develop` em 2026-10-25
(commit `95c159b`), feita contra Postgres + RLS + Redis reais e Chrome
headless sobre o build de produção, encontrou falhas que esse checkpoint
nunca via. Resumo das mais críticas (detalhe completo em
`docs/PLAN-fase-12.md`):

- **C1** — CSP de produção bloqueia o script inline que o próprio Next
  injeta (`self.__next_f.push`), e o React não hidrata nenhuma página.
- **C2** — `FormFieldConfig.previewUrl` é uma função que atravessa a
  fronteira Server→Client; React derruba `/perfil` e
  `/configuracoes/instituicao` em produção (função não é serializável).
- **C3** — `AuditService.register` grava fora de `runWithTenantContext`;
  rotas `@Public()` (login, cadastro, reset, aceite de convite) não têm
  tenant no `AsyncLocalStorage` e a RLS recusa a escrita — nenhuma dessas
  rotas fica auditada.
- **C4** — a tolerância de 10s pro refresh (pensada pra duas abas
  renovando ao mesmo tempo) vale também pra tokens revogados por motivo de
  segurança (logout, troca de senha, "encerrar outras sessões") — dá pra
  ressuscitar uma sessão encerrada.
- **I1–I4** — IP/User-Agent fake nas sessões (tudo passa pelo servidor
  Next), sessão atual não identificável no `/perfil` (cookie de refresh com
  `path` restrito não chega lá), e-mail case-sensitive, e
  `docker compose up`/CI/onboarding quebrados em clone limpo.

Isso vira a Fase 12 (`docs/PLAN-fase-12.md`), fora da numeração original do
`Plano Base.md` (que termina na Fase 11). Este ADR é o pré-requisito dela,
no mesmo papel que o ADR 0006 teve para as Fases 1–11: sem ele, o
congelamento do `core/` (`AGENTS.md` §2) bloqueia qualquer etapa que
precise tocar `core/auth`, `core/authorization`, `core/platform-auth` ou
`frontend/src/core/registry`.

## Decisão

### 1. CSP com nonce força renderização dinâmica em toda a app

Resolver C1 significa adotar nonce por requisição
(`script-src 'self' 'nonce-<n>' 'strict-dynamic'`), gerado em
`frontend/proxy.ts` e propagado via `x-nonce` pro Next aplicar nos próprios
scripts (guia oficial do Next, "Adding a nonce with Proxy"). Nonce por
requisição só funciona se a página renderizar por requisição — não dá pra
prerenderizar estaticamente uma página e ainda assim variar o nonce a cada
GET. Consequência direta, aceita deliberadamente: `/auth/login`,
`/auth/register`, `/platform/login`, `/termos` e
`/auth/forgot-password` deixam de ser `○` (estática) e passam a ser `ƒ`
(dinâmica) no build do Next.

Em troca, esse mesmo efeito colateral **resolve de graça** a pendência
registrada no `PLAN.md` em 2026-10-25 ("usuário já autenticado que visita
`/auth/login` ou `/platform/login` não é redirecionado pra dentro"): a
causa raiz identificada ali foi justamente a página ser estática — o
`proxy.ts` não conseguia reavaliar o redirect condicional por cookie em
cada requisição contra uma página pré-renderizada. Com a página dinâmica
por força da CSP, o redirect volta a rodar por requisição e passa a
funcionar. Cobrir esse comportamento no smoke da 12.1 (hoje seria `✗`, mas
só fica verde depois da 12.2 — por isso **não** entra na tabela de cenários
`it.failing` da 12.1, que é só sobre o backend contra Postgres real e o
smoke de erros/CSP/scroll).

**Alternativa rejeitada:** manter CSP com hash em vez de nonce. Hash exige
saber o conteúdo exato do script inline de antemão; o script que o Next
injeta (`self.__next_f.push(...)`) varia por página/payload, tornando hash
inviável sem reimplementar a injeção do próprio framework. Nonce é o que o
guia oficial do Next recomenda exatamente para esse script.

### 2. Access token ganha a claim `sid` (= `familyId` da sessão)

Resolver I2 (sessão atual não identificável em `/perfil`) sem alargar o
`path` do cookie de refresh (`/api/auth`, hoje restrito deliberadamente —
ver comentário em `frontend/src/lib/session.ts`: "Path restrito... Reduz a
superfície de ataque"). Alargar o `path` pra `/` exporia o refresh token
opaco a toda Server Action/página, não só ao endpoint de refresh — enfraquece
uma decisão de segurança já tomada, só pra resolver um problema de
identificação. Em vez disso, o próprio access token (que já chega em toda
chamada autenticada, incluindo as de `/perfil`) passa a carregar `sid`,
assinado pelo backend no login e na rotação do refresh. `me.service.ts`/
`me.controller.ts` usam `req.user.sid` para saber qual sessão é "a atual"
em vez de depender do cookie.

**Alternativa rejeitada:** alargar o `path` do cookie `refresh_token` para
`/`. Resolveria o mesmo problema, mas reabre a superfície de ataque que o
`path` restrito foi desenhado pra fechar (o token opaco passaria a ser
enviado em toda requisição ao Next, não só `/api/auth/*`). Rejeitada.

## Consequências

- `/auth/login`, `/auth/register`, `/platform/login`, `/termos` e
  `/auth/forgot-password` perdem a otimização de página estática (custo de
  performance pequeno e aceito — são páginas de baixo tráfego comparadas ao
  resto da app).
- O payload do JWT de acesso cresce uma claim (`sid`). Tokens emitidos antes
  do deploy desta fase não têm `sid` — comportamento até expirarem (≤15 min)
  é o atual (sessão "atual" não identificável), sem quebrar nada.
  `scope: 'platform'` do `PlatformUser` (ADR 0012) é um payload JWT
  diferente e não ganha `sid` nesta fase (sessão de plataforma é tratada
  separadamente na etapa 12.11).
- O gerador (`new-module.mjs`) e `docs/guia-novo-modulo.md` não mudam por
  este ADR — nenhuma etapa da Fase 12 introduz padrão novo de módulo de
  domínio.
- `CLAUDE.md` passa a citar este ADR na lista de ADRs por fase; `PLAN.md`
  passa a apontar pra `docs/PLAN-fase-12.md` como trabalho em andamento.
