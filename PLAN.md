# PLAN.md — Trabalho atual

> Só o que está em andamento. O roteiro completo das fases v1 → v1.1/v2 está
> em `Plano Base.md`. O histórico até a v1 está em `docs/historico/PLAN-v0.md`.

## Agora

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
- 10.3 (CSP): headers corretos confirmados via `curl` num build de
  produção local; falta um teste manual num browser real (sem
  `chromium-cli`/Playwright utilizáveis no ambiente onde foi implementado).
- 10.5/10.6 (deploy, backup/restore): documentação e scripts prontos, mas
  nunca executados de ponta a ponta (sem `docker`/`pg_dump` disponíveis
  onde foram escritos) — primeira execução real fica pra quem tiver acesso
  a um ambiente de staging.
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
- **[Investigado em 2026-10-25, sem mudança de código]** Usuário já
  autenticado que visita `/auth/login` ou `/platform/login` não é
  redirecionado automaticamente pra dentro — confirmado real (não é nota
  obsoleta) e a causa raiz foi isolada: as duas páginas são prerenderizadas
  como estáticas (`○` no output do `next build`, ao contrário de
  `/dashboard`/`/platform/tenants`, que são `ƒ`/dinâmicas), e o
  `proxy.ts` não consegue aplicar de forma confiável, nesta versão do
  Next, o redirect condicional baseado em cookie pra uma página estática
  nessa direção (autenticado → afastar do login); a direção que importa
  pra segurança (bloquear acesso sem sessão) continua garantida pelos
  guards de cada layout (`(app)/layout.tsx` e
  `platform/(authenticated)/layout.tsx`, que chamam o backend de
  verdade) — sem risco de segurança, cosmético confirmado. Resolver de
  verdade exigiria tornar essas páginas dinâmicas (perder a otimização
  estática) — decisão de arquitetura a discutir antes de implementar, não
  feita agora.
