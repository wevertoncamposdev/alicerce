# PLAN.md — Trabalho atual

> Só o que está em andamento. O roteiro das fases v1 → v1.1/v2 está em
> `Plano Base.md`; o endurecimento pós-revisão está em
> `docs/PLAN-fase-12.md`. O histórico até a v1 está em
> `docs/historico/PLAN-v0.md`.

## Agora

- [x] Fase 12 (Endurecimento) — etapas 12.0–12.2 concluídas em 2026-10-25.
      12.0: ADR 0013 (`docs/adr/0013-endurecimento-da-base.md`), saída do
      congelamento pra `docs/PLAN-fase-12.md`. 12.1: suíte `test:e2e:db`
      (Postgres/Redis reais, `backend/test-db/`) + smoke Playwright
      (`frontend/e2e/smoke.spec.ts`). 12.2: CSP com nonce por requisição
      (corrige C1) — ver pendência resolvida abaixo, achado grande: o
      `proxy.ts` nunca executava em produção. Próximo: etapa 12.3 (campo
      `image` serializável, C2).
- [x] Fases 0–10 do `Plano Base.md` concluídas em 2026-10-24 (etapas 9.2,
      9.3 e 10.1–10.6 na mesma sessão que fechou a Fase 9 — ver histórico
      de commits `feat(lgpd)`/`feat(ops)`/`docs(ops)`).
- [x] Fase 11 — "Management mínimo" concluído em 2026-10-25: ADR 0012
      (`docs/adr/0012-usuario-de-plataforma.md`), `PlatformUser` +
      autenticação separada (`core/platform-auth`), `modules/management`
      (listar/suspender/reativar tenants, caixa única de feedbacks
      cross-tenant) e telas em `frontend/src/app/platform/`. Verificado
      de ponta a ponta contra o banco local real (login, guard rejeitando
      token de tenant e vice-versa, suspender/reativar, feedbacks de 2+
      tenants numa única chamada) — ver commits `docs(adr)`/
      `feat(platform-auth)`/`feat(management)`/`feat(platform)`.
- [ ] Fase 11 — Billing: sob demanda, puxado pelo TerceiroGestor quando
      houver o primeiro cliente pagante. Não iniciado.
- [ ] Fase 11 — Impersonação auditada e feature flags: pós-mínimo,
      explicitamente adiado pelo próprio `Plano Base.md`. Não iniciado.

## Pendências conhecidas (não bloqueiam)

- 10.2 (monitoramento): adapter Sentry implementado e gated por env, mas
  nunca confirmado contra um painel Sentry real (exige conta/projeto).
- **[Resolvido em 2026-10-25, etapa 12.2]** 10.3 (CSP): confirmado num
  browser real (Chromium via Playwright) — nonce presente e diferente a
  cada requisição, zero violações de CSP. A versão anterior desta nota
  ("confirmado via curl, falta teste em browser real") ficou obsoleta
  junto com a descoberta de que o proxy nunca tinha executado de verdade
  (ver nota da etapa 12.2 mais abaixo) — o `curl` da época só viu os
  headers de `next.config.ts`, nunca o CSP do proxy.
- 10.5/10.6 (deploy, backup/restore): documentação e scripts prontos, mas
  nunca executados de ponta a ponta (sem `docker`/`pg_dump` disponíveis
  onde foram escritos) — primeira execução real fica pra quem tiver acesso
  a um ambiente de staging.
- **[Achado na etapa 12.2, escopo pra 12.10]** O item 6 da 12.10
  ("/roles tem rolagem horizontal a 375px") é mais abrangente do que
  descrito: com a hidratação funcionando de verdade (pós-12.2), o mesmo
  overflow apareceu também em `/users`, mas não em `/audit` — o
  `ListView`/`TypeView` compartilhado é candidato mais provável do que
  algo isolado de `/roles`. A 12.10 precisa mapear exatamente quais
  rotas são afetadas antes de corrigir — ver `frontend/e2e/smoke.spec.ts`,
  teste "sem rolagem horizontal a 375px", hoje `test.skip()` em toda
  rota por esse motivo (não dá pra marcar `test.fail()` por rota sem
  mapear o alcance real primeiro).
- **[Achado na etapa 12.2, escopo pra 12.3]** C2 (`FormFieldConfig.
  previewUrl` função não serializável) foi confirmado real em `/perfil`
  e `/configuracoes/instituicao` (erro "Functions cannot be passed
  directly to Client Components"), mas de forma **instável**: numa
  rodada do smoke falhou nas duas rotas, em outra só numa, e numa
  terceira passou nas duas. Possível relação com timing de streaming/
  Suspense do App Router. A 12.3 precisa confirmar se corrigir o
  `previewField` (desenho já no `docs/PLAN-fase-12.md`) resolve de vez,
  já que a causa (campo `image` com função) deveria ser determinística,
  não instável.
- 11 (management): ações de suspender/reativar tenant são logadas via
  `Logger`, não gravadas em `Audit` (exceção deliberada, decisão 4 do ADR
  0012 — `Audit.userId` é FK pra `User`, platform user não é `User`).
- **[Resolvido em 2026-10-25]** `backend/scripts/create-platform-user.ts`
  e `sync-permission-catalog.ts` falhavam via `tsx` — causa real não era
  `StorageModule` (hipótese anterior, descartada: o provider é síncrono,
  sem `onModuleInit`, sem relação com o adapter HTTP): `FilesService`
  mistura um parâmetro `@Inject(STORAGE_PROVIDER)` com um parâmetro de
  tipo implícito (`PrismaService`) no mesmo construtor, e o esbuild do
  `tsx` não emite `design:paramtypes` completo nesse caso (`nest start`/
  `nest build`, via `tsc`, não têm essa limitação). `backup:db`/
  `restore:db` nunca foram afetados — não sobem o Nest, usam
  `execFileSync('pg_dump'/'pg_restore')` puro. Corrigido isolando
  `backend/scripts/scripts.module.ts` (`ConfigModule` + `PrismaModule` +
  `RedisModule` + `AuthorizationModule`, sem `FileModule`/`StorageModule`)
  — os dois scripts agora usam esse módulo em vez do `AppModule` inteiro.
  Nenhuma mudança em `core/`.
- **[Resolvido em 2026-10-25]** Achado ao verificar a pendência abaixo:
  `frontend/src/app/platform/layout.tsx` envolvia **também**
  `/platform/login` e redirecionava pra lá quando não autenticado — a
  própria página de login se redirecionando pra si mesma, um loop
  infinito real (confirmado com `curl -L --max-redirs 5`), não cosmético.
  Corrigido movendo `tenants/` e `feedbacks/` para
  `frontend/src/app/platform/(authenticated)/` (route group, não afeta
  URL) e deixando `platform/login/page.tsx` fora dessa árvore.
- **[Resolvido em 2026-10-25, etapa 12.2]** Usuário já autenticado que
  visita `/auth/login` ou `/platform/login` não era redirecionado pra
  dentro. A causa raiz registrada em 2026-10-25 (páginas estáticas,
  proxy "não consegue reavaliar o redirect") estava **errada** — a causa
  real, só descoberta ao debugar por que o CSP com nonce da etapa 12.2
  não aparecia em nenhuma resposta: **`frontend/proxy.ts` nunca executava
  em produção**, para rota nenhuma, desde sempre. O Next 16 só reconhece
  `proxy.ts` quando ele fica no mesmo nível de `app/` — como este projeto
  usa `src/app/`, o arquivo precisava estar em `src/proxy.ts`, não na
  raiz do repo. Confirmado com um `console.error` no topo da função: zero
  linhas no log do servidor antes da correção; `ƒ Proxy (Middleware)`
  ausente do output do `next build` antes, presente depois. Isso também
  expõe por que a direção que importa (bloquear sem sessão) nunca
  quebrou: o guard de verdade sempre foi o `redirect()` de cada layout
  (`(app)/layout.tsx`, `platform/(authenticated)/layout.tsx`), que chama
  o backend direto — o proxy nunca foi a única barreira, só achávamos que
  era. Corrigido movendo o arquivo pra `frontend/src/proxy.ts` (etapa
  12.2, junto da correção de C1 — a mesma investigação achou os dois).
  Consequência exposta pelo proxy agora executando de verdade: faltavam
  em `PUBLIC_ROUTES` as rotas `/termos`, `/auth/forgot-password`,
  `/auth/reset-password`, `/auth/verify-email`, `/auth/accept-invite`,
  `/auth/confirm-email-change` — sem sessão, qualquer uma delas caía num
  redirect pro login (ex.: link de "Termos de Uso" do cadastro, ou o link
  de redefinir senha do e-mail). Corrigido na mesma etapa.
