# PLAN.md — Trabalho atual

> Só o que está em andamento. Histórico (fases v0, Fase 12, roteiro de
> finalização) está em `docs/historico/`. Itens adiados com gatilho:
> `docs/backlog.md`.

## Agora

- F7 (processo enxuto) em andamento — ver `CLAUDE.md`/`AGENTS.md`.
- Revisão de risco pré-TerceiroGestor (abaixo) — roda antes do F8.

## Revisão de risco pré-TerceiroGestor

Achados de auditoria do estado atual da base (2026-11-04), antes de abrir o
repositório do TerceiroGestor. `feedback` nunca exercitou dinheiro, anexo
de domínio nem relação N:N — por isso a revisão.

### Fase 0 — bloqueadores (decidir antes do Day 1 do produto) — FECHADA

- [x] `core/files` liberado para `application/pdf` (além de PNG/JPEG/WebP)
      — usado por avatar/logo e pela aba Anexos. Junto: validação dos
      bytes reais contra o mime declarado (fecha o item "MIME por bytes"
      que `docs/backlog.md` 12.13 tinha adiado pra "2+ réplicas" — nada
      ali dependia de réplica) e header `X-Content-Type-Options: nosniff`
      em `GET /files/:id/content`. Checkpoint completo rodado: backend
      tsc/lint/test/test:e2e verdes (239+75 testes); `test:e2e:db` não
      rodou neste ambiente (sem Postgres/Docker disponível — Prisma
      bloqueou o `migrate reset` por ser destrutivo, corretamente, sem
      consentimento explícito); frontend tsc/lint/build verdes, 91 testes
      unitários verdes, `test:smoke` com 2 falhas (login/sessão) por falta
      de backend real no ambiente — não relacionadas à mudança.
- [x] ~~"Módulo Relacionado" (N:N) sem suporte no gerador~~ — investigado:
      não é lacuna, é decisão já tomada (sem flag no gerador por escolha,
      cada N:N carrega regra própria). O padrão já existe em produção
      (`roles`) e na demo `/develop`, só não estava em
      `docs/guia-novo-modulo.md`. Corrigido: nova §9 no guia documenta o
      padrão (backend: endpoints próprios + pivô tenant-scoped; frontend:
      `RelationHost`/`RelationCrudHost`). Sem ADR — não inventa padrão novo
      (`AGENTS.md` "Proibido").
- [x] Convenção "dinheiro em centavos (Int)" — decisão: não criar
      lint/CI agora (nenhum schema usa `Float` ainda, e não existe infra
      de lint de schema Prisma a estender — seria engenharia
      especulativa). Registrado em `docs/backlog.md` com gatilho "Módulo
      1 do TerceiroGestor declarar o primeiro campo monetário real".
      Bônus da investigação: `docs/backlog.md` tinha duas linhas
      desatualizadas apontando pro Módulo 1/2 do TerceiroGestor (tipos de
      campo data/cpf/telefone/moeda/lookup, e gerador de Feature filha) —
      ambos já estão implementados (`docs/guia-novo-modulo.md` §5, §7);
      removidas pra não confundir quem for começar o módulo.
- [x] Notificações — decisão: confirmado fora do escopo inicial.
      Registrado em `docs/backlog.md` com gatilho "TerceiroGestor
      precisar de alerta/aviso automático", apontando pra
      `docs/roadmap.md` (módulo `notifications`) — nunca lógica dentro do
      módulo de domínio.

### Fase 1 — riscos médios — FECHADA

- [x] Race condition no refresh de sessão corrigida
      (`frontend/src/app/api/proxy/[...path]/route.ts`): requisições 401
      concorrentes agora deduplicam a chamada a `/api/auth/refresh` pela
      própria chave do cookie `refresh_token` (um `Map` em memória do
      processo — correto só com 1 instância do backend; registrado no
      backlog com o mesmo gatilho do 12.13). Sem teste automatizado —
      nenhum Route Handler deste projeto tem teste hoje (gap existente,
      não desta mudança); tsc/lint confirmaram que compila e segue as
      regras, mas o comportamento em concorrência não foi exercitado.
- [x] Auditoria fire-and-forget: decisão — não virou transacional agora
      (exigiria mover a gravação pra dentro da transação de cada service,
      perdendo a cobertura automática do interceptor genérico; registrado
      no backlog com gatilho "primeiro módulo financeiro exigir"). Fechado
      parcialmente: falha de auditoria agora também aciona
      `MonitoringService.captureException` (Sentry em produção), não só
      log — deixa de ser 100% silenciosa. Teste atualizado e verde.
      **Achado só no checkpoint completo** (não no rápido): a nova
      dependência quebrava `test:e2e` com erro de DI em qualquer spec que
      monta `AuditModule` sem o `AppModule` inteiro — `AuditModule` não
      importava `MonitoringModule`. Corrigido; os 26 suites/75 testes de
      `test:e2e` só passam de forma confiável com `--runInBand` neste
      ambiente (em paralelo, vários `beforeAll` excedem o timeout de 5s
      por contenção de recursos da máquina, não por bug — confirmado
      rodando os dois jeitos).
- [x] CI `npm audit`: backend perdeu o `continue-on-error` (hoje sem
      high/critical, confirmado rodando o audit de verdade) — passa a
      bloquear merge. Frontend mantém a flag: achado real e sério durante
      a investigação — `next@16.4.0` (versão em uso) tem **RCE crítica
      não-autenticada** (GHSA-2464-fhr4-w9xw, Image Optimization API +
      SVG) e DoS em Server Actions. Patch é `16.4.5` (não é upgrade de
      major). Decisão sua: não autorizar o patch agora — vai rodar
      via `/upgrade-deps`; registrado no backlog e no `CHANGELOG.md`
      pra não se perder.
- [x] `test:smoke` ganhou os dois testes que faltavam: autosave de campo
      de texto (`feedbacks`, edita `description`, recarrega, confirma
      persistência) e attach/detach de relação N:N (`roles` → `users`,
      picker + detach com confirmação). tsc/lint limpos, mas **não
      executados de ponta a ponta aqui** — não há Postgres/backend
      acessível neste ambiente (confirmado: `curl localhost:5000`
      falha); os dois ficam marcados "did not run" numa rodada local do
      `test:smoke` por causa disso, não por erro nos testes novos. Vão
      rodar de verdade no CI (que levanta os serviços reais) no próximo
      push.

### Fase 2 — piloto real no TerceiroGestor

- [ ] Classificar cada entidade do domínio pela taxonomia (`AGENTS.md`
      §4.3) antes de gerar.
- [ ] Primeiro módulo real (provavelmente "Terceiro") serve de teste de
      fogo: campo monetário, anexo de contrato, e pelo menos uma relação
      N:N — os três pontos que `feedback` nunca validou.

## Próximo

- F8 (manual, por você, só depois da revisão acima): merge `develop` →
  `main` com CI verde, tag `v1.0.0`, criar o repositório do
  TerceiroGestor a partir dessa tag. `[Unreleased]` do `CHANGELOG.md`
  está grande (todo o U0–U9 da fundação UX) — vira o corpo real da nota
  de versão `v1.0.0`/`v1.1.0`, não é só mover o cabeçalho; eu não
  mergeio/tageio por conta própria (ação manual, não decisão a revisar).
- Depois do F8, o trabalho passa a ser o TerceiroGestor: módulos de
  domínio novos sobre a base congelada. `feedback` continua como módulo
  de referência até o primeiro módulo real ficar pronto.
