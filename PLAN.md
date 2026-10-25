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
  Script `backend/scripts/create-platform-user.ts` está correto (mesmo
  padrão comprovado de `sync-permission-catalog.ts`), mas falha ao rodar
  via `tsx`/`NestFactory.createApplicationContext(AppModule)` neste
  ambiente — `FilesService`/`STORAGE_PROVIDER` não resolve fora do boot
  completo do `nest start` (bug pré-existente, não introduzido agora;
  afeta igualmente `sync:permissions`/`backup:db`/`restore:db`). Workaround
  usado pra validar o fluxo: insert direto via `PrismaClient` sem o grafo
  do Nest. Vale investigar a ordem de inicialização de `StorageModule`
  separadamente — fora do escopo deste ADR.
- 11 (management/frontend): usuário de plataforma já autenticado que
  visita `/platform/login` não é redirecionado automaticamente pro
  dashboard — mesmo comportamento (não é regressão) já existe hoje no
  fluxo de tenant (`/auth/login` com `session_token` válido também não
  redireciona nesta base). Sem risco de segurança (a direção que importa —
  bloquear acesso sem sessão — funciona nos dois fluxos); cosmético.
