# Changelog

Todas as alterações relevantes deste projeto serão documentadas neste arquivo.

O versionamento segue o padrão Semantic Versioning (SemVer).

---

## [Unreleased]

## [1.2.0] - 2026-11-04

### Security

- CI (`security-audit`): `npm audit` do backend deixa de ter
  `continue-on-error` — hoje não há high/critical ali. O do frontend
  continua com a flag por ora: `next@16.4.0` tem RCE crítica conhecida
  (GHSA-2464-fhr4-w9xw), patch disponível (16.4.5) represado pra rodar
  via `/upgrade-deps` (decisão do usuário, ver `PLAN.md`) — bloquear o CI
  agora travaria todo merge por algo com decisão já tomada de adiar.

### Added

- `e2e/smoke.spec.ts` ganha dois testes que faltavam: autosave de campo
  de texto (feedbacks, `createMode: "detail"`, edita `description`,
  recarrega, confirma persistência) e attach/detach de relação N:N
  (`roles` → `users`, via `RelationHost`/`RelationCrudHost`) — os dois
  mecanismos que todo módulo novo reaproveita e que o smoke não cobria.

- `core/files`: whitelist de upload ganha `application/pdf` (além de
  PNG/JPEG/WebP), usada tanto por avatar/logo quanto pela aba Anexos do
  drawer de metadados (`backend/src/core/files/file.service.ts`,
  `frontend/.../AttachmentsPanel.tsx`) — motivo real: TerceiroGestor
  precisa anexar contrato/nota fiscal em PDF. Junto, validação dos bytes
  reais do arquivo contra o mime declarado (`matchesDeclaredMime`) e
  header `X-Content-Type-Options: nosniff` em `GET /files/:id/content` —
  fecha, pra esse endpoint, o item "MIME por bytes" que `docs/backlog.md`
  tinha adiado pra "2+ réplicas" (12.13); Redis lock/Throttler continuam
  adiados, sem relação com réplica.
- Gerador (`scripts/new-module.mjs`) ganha `--feature-of=<modulo-pai>`:
  gera Feature filha (model com `id` própria, FK pro pai com
  `onDelete: Cascade`, acrescentado no `.prisma` do pai; rota nested
  registrada direto no `.module.ts` do pai; sem permissão nova no
  catálogo; aba nova em `relations` do `contract.tsx` do pai via
  `RelationTablePanel`) — mesmo padrão de `FeedbackComment`, agora gerado
  em vez de manual — ver `docs/guia-novo-modulo.md` §7 (U9, ADR 0014).
  Módulo independente passa a gerar colunas tipadas
  (`ColumnConfig`/`buildColumns`, U3) e `detailConfig.metadata` ligado por
  padrão (U6) em vez de `loadContext` (U9, ADR 0014).
- `User` ganha `phone` opcional (fecha o mínimo da seção 2 do
  `docs/PLAN-fundacao-ux.md`), editável via `/users/:id` (admin) e
  `/perfil` (self-service, `/me`) (U7, ADR 0014).
- Gerador (`scripts/new-module.mjs`) ganha `--extends=<modulo>`: gera uma
  Extensão 1:1 (model com `id` = FK do pai, endpoints `GET/PATCH` sem
  lista, seção extra no detail do pai, sem permissão nova no catálogo) —
  ver `docs/guia-novo-modulo.md` §8 (U7, ADR 0014).
- `createJsonDataHandlers` (`core/data-provider/json.ts`): motor de
  dados em memória com o mesmo contrato dos handlers REST, pra módulos
  de demonstração (U1, ADR 0014).
- `entityLabel`/`fieldLabel`/`actionLabel` (`core/registry/labels.ts`) e
  `defineEnum`/`EnumBadge` (`core/registry/enum.ts`,
  `core/components/DetailView/EnumBadge.tsx`): ponto central de rótulo
  e tom de cor, pra tirar verbo HTTP/enum cru da tela (U2, ADR 0014).
- `ColumnConfig`/`buildColumns` (`core/registry/types.ts`,
  `core/components/Layout/column-builder.tsx`): tipo de coluna
  declarativo (text/title/badge/date/datetime/money/relation/tags/
  count) pra lista, opcional — alternativa ao `ColumnDef` cru do
  TanStack (U3, ADR 0014).
- `FieldGrid` (`core/components/DetailView/FieldGrid.tsx`): grid
  compartilhado por `FieldList` (leitura) e `FormView` (edição), rótulo
  em cima do valor, `span` 1/2/3 e `help` por campo — campo somente
  leitura com o mesmo visual do editável (U4, ADR 0014).
- Tipos de campo novos no `FormView` — `cpf`/`cnpj`/`phone` (máscara),
  `document` (CPF ou CNPJ pelo campo irmão), `cep` (com busca de
  endereço via ViaCEP, `core/registry/address-lookup-action.ts`),
  `tags`/`multiselect` (chips) e `lookup` (busca outro registro e
  mostra link, `LookupFieldInput.tsx`, reaproveita `searchRecordsAction`)
  (U4, ADR 0014).
- Relações da demo (Pessoa↔Atividade via `Vinculo`, Pessoa→Atendimento)
  passam a renderizar com `ColumnConfig`/`buildColumns` (U3) dentro de
  `RelationCrudHost`, em vez do `ShowcaseRelationTable` antigo — nome do
  registro vira coluna `relation` (link), `tipo`/`situacao` do
  atendimento usam `badge` com os enums já existentes. Botão "Adicionar"
  sem lógica (no-op) foi removido em vez de mantido como enfeite (U5,
  ADR 0014; unificação de abas e trilha multi-nível de navegação ficaram
  fora do escopo — ver `docs/backlog.md`).
- Drawer de metadados ganha Notas, Tags e Anexos (a aba Contexto sai —
  "criado em/última atualização" passam a vir do próprio Histórico):
  `core/metadata/` novo no backend (`notes/`, `tags/` com pivô
  `record-tags`), `core/files` estendido com listagem por dono
  (`GET /files?ownerType=&ownerId=`) e `originalName`, permissão
  dinâmica `<entity>.read`/`<entity>.update` sem entrada nova no
  catálogo (`core/authorization/record-permission.util.ts`). Histórico
  (renomeado de Auditoria) agrupa por dia e humaniza os campos
  alterados via `fieldLabel` (U2). Demo (Pessoas/Atividades/
  Atendimentos) mostra as quatro abas com fixture em memória;
  `feedbacks` é o primeiro módulo real, com teste `test-db` de
  isolamento entre tenants (U6, ADR 0014).

### Fixed

- Proxy BFF (`frontend/src/app/api/proxy/[...path]/route.ts`): dedup de
  refresh concorrente — requisições paralelas que recebem 401 ao mesmo
  tempo (comum em DetailView com RelationShell + MetaDataSidebar
  carregando juntos) agora compartilham a mesma chamada a
  `/api/auth/refresh` em vez de cada uma gastar o `refresh_token`
  rotativo por conta própria, o que o backend tratava como reuso
  suspeito e derrubava a sessão por uma concorrência legítima.
- `AuditInterceptor`: falha ao gravar auditoria agora também chama
  `MonitoringService.captureException` (Sentry em produção), não só
  `logger.error` — fechamento de trilha de auditoria continua best-effort
  (não transacional com a mutação de negócio, ver `docs/backlog.md`), mas
  deixa de ser uma falha 100% silenciosa.
- `AuditModule` passa a importar `MonitoringModule` — a nova dependência
  do item acima quebrava `npm run test:e2e` com "Nest can't resolve
  dependencies of the AuditInterceptor... MonitoringService" em qualquer
  spec que monta `AuditModule` sem o `AppModule` inteiro
  (`MonitoringModule` é `@Global()`, mas isso não ajuda se nunca entrou
  no grafo de módulos daquele teste). Achado rodando o checkpoint
  completo, não só o rápido.
- Autosave envia só os campos alterados desde o último save, nunca `""`
  em campo vazio (D2, ADR 0014).
- Erro de validação chega estruturado por campo até a tela, mesmo em
  produção (D5, ADR 0014).
- Preview de avatar/logo passa a ser same-origin via proxy BFF
  (`GET /files/:id/content`), em vez de apontar direto pro backend —
  funciona com CSP e com backend sem domínio público (D6, ADR 0014).
- Upload de foto acima de 1 MB não dá mais 500: limite de Server Action
  subiu pra 6 MB e a imagem é redimensionada (~512px, WebP) no browser
  antes de enviar (D7, ADR 0014).
- `POST /files` não gravava `ownerId` (só `ownerType`) — qualquer
  listagem de arquivo por dono (aba Anexos, U6) nunca encontrava nada
  pra um upload recém-feito (U6, achado durante a implementação).

---

## [1.0.0] - 2026-10-17

Fechamento da v1: base congelada, pronta para evoluir só por módulos de
domínio novos.

### Added

- Estrutura de instruções reescrita em `AGENTS.md`, `CLAUDE.md` e `PLAN.md`.
- Roadmap de funcionalidades sob demanda em `docs/roadmap.md`.
- Histórico restaurado em `docs/historico/PLAN-v0.md` e `docs/historico/AGENTS-v0.md`.
- Módulo `feedback`, novo módulo canônico de exemplo da base (status,
  comentários via `RelationShell`, permissão `feedback.manage`), gerado com
  `npm run new:module` — ver `docs/guia-novo-modulo.md`.
- Auditoria de login com senha incorreta (`AuditType.LOGIN_FAILED`).
- Proteção contra o tenant ficar sem nenhum administrador: bloqueia remover
  a própria role de admin e bloqueia desativar/remover/excluir o último
  admin do tenant.

### Changed

- Padronização da documentação de setup e referência do projeto para o estado v1.
- Site interno `/develop` passa a citar o módulo `feedback` como referência.

### Fixed

- Ajuste de encoding dos arquivos de histórico para evitar que fiquem como binários no diff.

### Removed

- Templates antigos e documentos obsoletos em `docs/` e `REVISAO.md` movido para histórico.
- Módulo de exemplo antigo `examples`/`favorites` (backend e frontend),
  substituído pelo módulo `feedback`.
- `frontend/src/modules/_template/`, não usado pelo gerador.

---

## [0.1.0] - Em desenvolvimento

### added

- Estrutura inicial do projeto
- Feature favorites

## [0.7.0] - Em desenvolvimento
