# PLAN.md — Backlog tático do Alicerce

> Este arquivo é o backlog **vivo**: o que falta fazer agora, em passos pequenos e
> priorizados, para o Alicerce virar uma base de template completa e segura. As regras
> de arquitetura e o roadmap de alto nível ficam em [AGENTS.md](./AGENTS.md); aqui é o
> "próximo passo" concreto. Atualize marcando `[x]` ao concluir um item, e adicione
> novos itens conforme surgirem — não deixe este arquivo ficar parado como o
> `backend/issues.md` ficou.
>
> Levantamento feito em 2026-10-13 por auditoria completa do código (backend +
> frontend) contra o que `AGENTS.md`/ADRs/docs já prometem. Cada item cita o
> arquivo real envolvido. A implementação segue o método do `AGENTS.md` §7: entender →
> planejar → implementar **um passo por vez** → checkpoint → commit — não implementar
> vários itens de uma vez só porque estão na mesma lista.

---

## P0 — Dependências e vulnerabilidades (frameworks desatualizados, npm audit)

Levantado em 2026-10-13 via `npm outdated` + `npm audit` + `npm view <pkg> dist-tags`
nos dois projetos. **P0.1 e P0.2 executados em 2026-10-13.** Backend caiu de 26
vulnerabilidades (2 critical) para 2 (0 critical); frontend caiu de 19 (2 critical)
para 9 (0 critical). Checkpoint completo (`tsc --noEmit`, lint, test/build) passou
nos dois projetos depois da mudança.

### P0.1 — Correções seguras imediatas (sem major, baixo risco) — ✅ feito

- [x] **Next.js — CRÍTICO, corrigido.** `frontend/package.json`: `16.2.6` → `16.4.0`
  (mesma major). Fechava RCE não autenticado em servidor Windows, RCE na Image
  Optimization API (AVIF) e no `next/og`, SSRF em rewrites, cache poisoning de
  SSG/ISR. `eslint-config-next` acompanhou para `16.4.0`. Build de produção
  (`next build`) e `tsc --noEmit` passaram limpos depois do bump.
- [x] **`multer` (backend).** Override e dependência direta `^2.2.0` → `^2.4.0`
  (a correção anterior, documentada em `backend/doc/audit.prod.dependency.multer.md`,
  tinha ficado defasada — vulnerabilidades novas desde então atingiam até 2.3.0).
- [x] **`@hono/node-server` (backend).** Override `^2.0.6` → `^2.1.5` (o range
  vulnerável era `2.0.0-2.0.9`; o override antigo ainda caía dentro dele).
- [x] **NestJS — bump de patch dentro da v11** (backend): `@nestjs/common`,
  `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/platform-fastify`,
  `@nestjs/swagger`, `@nestjs/testing`: `11.1.27` → `11.2.7`.
- [x] **Prisma — bump de patch dentro da v7** (backend): `prisma`, `@prisma/client`,
  `@prisma/adapter-pg`: `7.8.0` → `7.10.0` + `npx prisma generate`.
- [x] `npm audit fix` (sem `--force`) nos dois projetos para o resto dos itens
  seguros (`fastify`, `handlebars`, `proxy-addr` no backend — os 2 CVEs *critical*
  do backend eram esses dois).
- [x] Checkpoint completo depois de cada bump — ver "Achados da execução" abaixo
  para o que precisou de atenção extra.

### P0.2 — Itens investigados antes de aplicar — ✅ feito

- [x] **`@fastify/static` (backend) — resolvido de tabela.** `@nestjs/platform-fastify@11.2.7`
  já exige `@fastify/static@^10.1.2` como peer, então o próprio bump de patch do
  NestJS (P0.1) forçou a versão corrigida (`10.1.6`) — não era preciso esperar o
  NestJS v12 como o plano original supunha. `@fastify/static` em
  `backend/package.json` foi atualizado de `^9.1.3` para `^10.1.6`.
- [x] **`@prisma/config`/`deepmerge-ts`, `mysql2`, `chokidar`/`braces` via
  `nestjs-i18n` (backend) — resolvidos via `overrides`, sem downgrade.** O
  `npm audit fix --force` sugeria `prisma@6.19.3` (downgrade da 7.8.0 — rejeitado).
  Investigação mostrou que são todos pins exatos de dependências internas:
  `@prisma/config@7.10.0` pina `deepmerge-ts@7.1.5` (vulnerável, `<8.0.0`); a
  própria `prisma@7.10.0` pina `mysql2@3.15.3` (vulnerável, não usamos MySQL, só
  Postgres); `nestjs-i18n@10.8.5` depende de `chokidar@^3.6.0`, que traz `braces`
  vulnerável. Adicionados a `backend/package.json` → `overrides`:
  `"chokidar": "^4.0.0"` (confirmado via leitura de
  `node_modules/nestjs-i18n/dist/loaders/i18n.abstract.loader.js`: só usa
  `chokidar.watch(path, { ignoreInitial: true }).on('all', ...)`, API idêntica
  no v4, que não depende mais de `braces`/glob), `"mysql2": "^3.24.6"`,
  `"deepmerge-ts": "^8.0.0"`.
- [x] **`braces`/`fast-glob` no frontend (via `shadcn` CLI e `eslint-config-next`)
  — sem correção segura disponível, deixado em aberto.** `braces` está vulnerável
  em **todas** as versões publicadas (`range: "*"`); o único "fix" que o
  `npm audit fix --force` oferece é baixar `shadcn` de `4.13.0` para `1.0.0`
  (regressão grande, perderia funcionalidade atual do CLI). Como é cadeia
  100% devDependency (nunca entra no bundle do Next.js enviado ao navegador/servidor),
  o risco real é baixo — ficou documentado aqui para reavaliar quando `shadcn`/
  `eslint-config-next` publicarem uma versão que não dependa mais de `fast-glob`
  vulnerável.

### Achados da execução (vale ler antes de repetir este tipo de tarefa)

- **`npm run lint` do backend tem `--fix` embutido no script** (`eslint ... --fix`)
  — rodá-lo como parte do checkpoint **removeu silenciosamente** um cast de tipo
  explícito em `src/core/common/middleware/tenant.middleware.ts`
  (`this.jwtService.decode(token) as { tenantId?: string } | null` → sem o cast).
  `JwtService.decode<T = any>()` retorna `any` por padrão, então sem o cast
  `payload?.tenantId` virava um acesso inseguro em `any` — no arquivo de segurança
  mais sensível do backend (reescrito por motivo de segurança no commit `714dfa0`).
  **Revertido manualmente.** Lição: nunca rodar `npm run lint` do backend sem revisar
  o diff depois — considerar remover o `--fix` do script e deixar explícito
  (`eslint ...` + `eslint ... --fix` como comandos separados) como item de limpeza.
- **`tsc --noEmit` do backend já tinha 3 erros pré-existentes** em arquivos
  `*.spec.ts` (`permissions.controller.spec.ts`, `roles.service.spec.ts`,
  `user.controller.spec.ts`), sem relação com os bumps desta rodada (confirmado via
  diff dos tipos gerados do Prisma — nada mudou nos enums `PermissionType`/`RoleType`
  entre 7.8.0 e 7.10.0). Bate com o item já listado no `AGENTS.md` Fase 1 ("tsc dos
  specs limpo") — ainda pendente, não é regressão desta tarefa.
  **`npm run lint` do backend sem `--fix` tem 289 erros pré-existentes** espalhados
  em 35 arquivos (maior parte em `test/roles.attach-detach.e2e-spec.ts` e
  `roles.service.spec.ts`, mock de Prisma com `any`) — também pré-existente, também
  já reconhecido como pendente no `AGENTS.md` Fase 1 ("Zerar lint do backend").
- **`npm run lint` do frontend está quebrado** (erro de config: `globalIgnores` com
  `ignores` contendo algo que não é string/function) — já é o bug conhecido do
  `frontend/eslint.config.mjs` listado no `AGENTS.md` Fase 1 e no bloco P6 deste
  arquivo. Confirmado pré-existente (arquivo não tocado nesta tarefa).

### P0.3 — Upgrades maiores (cada um como tarefa própria quando formos fazer — regra do `AGENTS.md` §6.1, branch `chore/upgrade-<pacote>-<versão>`)

- [ ] **NestJS v11 → v12.** `latest` do pacote já é `12.1.3` (`11.x` passou a ser a
  tag `legacy`). Ler breaking changes oficiais antes; testar bootstrap, plugins
  Fastify (cookie/cors/helmet/static), Swagger e toda a suíte e2e depois. Resolve o
  último par de vulnerabilidades do backend (`fastify`/`@nestjs/platform-fastify`,
  1 moderate + 1 high — hoje só corrige com esse major, confirmado nesta rodada).
- [ ] **TypeScript 5.9 → 7.0.** Não é um bump trivial — é a reescrita nativa do
  compilador (não existe mais um "6.x" como major corrente). Tratar com atenção
  redobrada: `tsc --noEmit` limpo nos dois projetos antes de mesclar, revisar se
  `ts-jest`/`ts-loader`/`ts-node`/`tsx` já têm suporte.
- [ ] **Prisma 7 → 8 — só quando saísse do RC.** Hoje a tag `latest` do npm é
  `8.0.0-rc.22` (release candidate, não GA). Não adotar RC num projeto-template;
  monitorar até a tag `latest` apontar para uma versão estável antes de migrar.
- [ ] **Demais bumps menores do `npm outdated`** (tratar caso a caso, sem pressa):
  `@tanstack/react-table` 8→9 é major (conferir breaking changes do TanStack Table
  antes de subir — é usado em todas as `ListView` do frontend); `radix-ui`, `recharts`,
  `react-intl`, `shadcn` CLI, `@types/node` nos dois projetos; `react`/`react-dom`
  `19.2.4` → `19.3.0` (patch dentro da mesma major, sem vulnerabilidade associada).

---

## P1 — Segurança / isolamento de tenant (bloqueadores) — ✅ feito em 2026-10-13

Estes itens podem estar expondo dados entre tenants hoje. Tratar antes de qualquer
outra coisa, inclusive antes de acabamento visual.

- [x] **Vazamento de listagem de usuários entre tenants.** `UsersController.findAll`,
  `listRoles` e `listPermissions` agora usam `@TenantId()` em vez de
  `@Query('tenantId')`. `UserRepository.findManyActive` deixou de aceitar `tenantId`
  opcional — agora é obrigatório em toda a cadeia (`UsersController` →
  `UsersService.findAll/findAllWithValidation/getAdultUserStats` → repository),
  fechando a brecha na raiz, não só no controller.
- [x] **Leitura cruzada de usuário por UUID — e também update/remove, achado durante
  a correção.** `UsersService.findOne` já estava sem checar tenant, mas ao revisar o
  arquivo o mesmo problema apareceu em `update` e `remove` (não listados originalmente
  aqui) — nenhum dos dois verificava se o usuário pertencia ao tenant de quem fez a
  requisição antes de gravar/apagar. Os três agora seguem o mesmo padrão já usado em
  `RolesService.findOne/update/remove`: buscar por id, comparar `tenantId`, lançar
  `NotFoundException` (404, não 403 — não revela a existência do registro a outro
  tenant) antes de qualquer mutação.
- [x] **Módulos sem guard de permissão.** `RolesPermissionsGuard` + `@Roles`/`@Permissions`
  adicionados a `FavoritesController` (`favorite.*`), `FavoriteNotesController`
  (reaproveita `favorite.read`/`favorite.update`, é uma Feature do módulo favorites),
  `TaskController` (`task.*`, e removida a duplicação com `AuthGuard` já global) e
  `AuditController` (`audit.read`, `@Roles('ADMIN')` apenas). Confirmado que
  `TaskController`/`AuditController` já eram protegidos contra forjar `tenantId` na
  rota pelo `TenantMiddleware` (cobre `tenant/:tenantId/*path` em `app.module.ts`) — o
  que faltava de fato era só a trava de role/permission, não o tenant em si.
- [x] **Catálogo de permissões duplicado e divergente.** Criado
  `backend/src/core/authorization/permission-catalog.ts` — `PERMISSION_CATALOG` (25
  permissões, união das duas listas antigas) + `TENANT_ADMIN_PERMISSION_NAMES`
  (tudo exceto `tenant.manage`, que continua reservado ao futuro módulo
  `management`). `prisma/seed.ts` e `AuthService.signUpPublic` agora consomem as duas
  constantes em vez de listas hardcoded — `signUpPublic` ganhou `favorite.*` que não
  tinha antes, `seed.ts` ganhou `task.*`/`audit.read` que não tinha antes. Validado
  rodando o seed de verdade contra o Postgres local: o role ADMIN do tenant semeado
  passou a ter as 24 permissões esperadas (todas exceto `tenant.manage`).
- [x] **Faltam índices em tabelas tenant-scoped.** Adicionado `@@index([tenantId])` em
  `Role`, `UserRole`, `RolePermission`; `@@index([familyId])` + `@@index([userId])` em
  `RefreshToken`. Para `Audit`, em vez de um índice genérico, dois compostos que batem
  com as consultas reais de `AuditService.findAll`: `@@index([tenantId, createdAt])`
  (trilha geral do tenant, mais recente primeiro) e
  `@@index([tenantId, entity, entityId])` (aba de auditoria do DetailView, que filtra
  por entidade). `Permission` **não** ganhou índice novo — seu `@@unique([tenantId, name, resource])`
  já começa por `tenantId` e serve de índice sozinho; um `@@index([tenantId])` separado
  seria redundante (comentário deixado no schema explicando o motivo). Migration
  `20261013220015_add_tenant_scoped_indexes` gerada e aplicada contra o Postgres local.
- [x] **Teste e2e de isolamento cross-tenant.** `backend/test/user-tenant-isolation.e2e-spec.ts`
  (novo) — módulo `UsersModule` isolado com `PrismaService` mockado em memória,
  `RolesPermissionsGuard` sobrescrito para focar só no isolamento de tenant (RBAC já
  tem teste próprio). Cobre exatamente os dois bugs corrigidos: `GET /user` só lista o
  próprio tenant; `GET/PATCH/DELETE /user/:id` retornam 404 para usuário de outro
  tenant, e `PATCH`/`DELETE` confirmadamente **não** tocam o registro (dados
  inalterados após a tentativa). 5/5 passando.
  **Achado colateral, não corrigido aqui:** `test/roles.attach-detach.e2e-spec.ts`
  (pré-existente) está com 4/4 testes falhando — confirmado via `git stash` que a
  falha já existia antes de qualquer mudança desta rodada. Causa provável: o teste só
  sobrescreve `RolesPermissionsGuard`, mas `RoleModule` também carrega o `AuthGuard`
  global (via `AuthModule`), que bloqueia a requisição antes de chegar lá. Ninguém
  notou porque o CI (`.github/workflows/ci.yml`) só roda `npm test` (unit), nunca
  `npm run test:e2e` — mesma lacuna já registrada no bloco P6. Vale um item futuro
  dedicado para corrigir esse teste e então ligar `test:e2e` no CI.

### Checkpoint desta rodada

`npx tsc --noEmit` (só os 3 erros pré-existentes, já documentados no P0, sem relação
com este trabalho), `npm test` (59/59), `npx jest --config ./test/jest-e2e.json
user-tenant-isolation` (5/5), `npm run build` — todos limpos nos dois módulos tocados
(backend apenas; esta rodada não exigiu nenhuma mudança no frontend).

---

## P2 — Consistência de auditoria e sessão

- [ ] **Dois registros de "interceptor global" em lugares diferentes.**
  `AuditInterceptor` é registrado via `app.useGlobalInterceptors()` em `main.ts`;
  `LoggingInterceptor` via `APP_INTERCEPTOR` em `app.module.ts`; `AuthGuard` via
  `APP_GUARD` em `auth.module.ts`. Comportamento "global" fica espalhado em 3 arquivos.
  Centralizar em `app.module.ts` para ficar visível num só lugar.
- [ ] **Erros somem do log.** `AllExceptionsFilter` (`all-exceptions.filter.ts`) nunca
  loga a exceção original antes de normalizar a resposta. `LoggingInterceptor` só usa
  `tap()` (sucesso), nunca `catchError()` — uma requisição que estoura 500 não deixa
  rastro nenhum no log atual. Corrigir os dois.
- [ ] **Auditoria sem before/after real.** `AuditInterceptor` sempre grava
  `type: 'DATA_CHANGE'` (os outros valores do enum `AuditType` nunca são usados),
  `before` é sempre `null`, `after` é o body da requisição sanitizado (não o estado
  realmente persistido). Já é item da Fase 6 do `AGENTS.md` — ao implementar, buscar o
  estado anterior antes da mutação e o estado salvo depois, não o payload da request.
- [ ] **Refresh de sessão no `proxy.ts` do Next.** Pendente desde a Fase 0 do
  `AGENTS.md`: ler o `exp` do JWT, renovar antes de expirar, gravar cookies no
  request e na response; `/api/auth/login` e `/api/auth/refresh` do Next devem ler o
  refresh via `headers.getSetCookie()` (o Nest só manda por `Set-Cookie`).

---

## P3 — Limpeza de código morto e reconciliação de documentação

- [ ] Remover `frontend/src/modules/favorites/actions/actions.ts` e
  `constants/constants.ts` — órfãos (zero imports), colidem de nome com as funções
  reais de `config/provider.ts`.
- [ ] Remover `frontend/src/modules/roles/components/Forms.ts` (arquivo vazio, 0 bytes).
- [ ] Decidir entre `frontend/src/modules/roles/config/client-actions.ts` e
  `actions/roleService.ts` — são duplicados byte a byte; só o segundo é importado pelos
  componentes (`RolePermissionsHost.tsx`, `RoleUsersHost.tsx`). Manter um, apagar o
  outro, e terminar a migração que o próprio `modules/develop` já descreve como aberta.
- [ ] Remover `frontend/src/lib/query-state/favorites-query-state.ts` (duplicado morto,
  substituído pelo genérico `list-query-state.ts`) e
  `frontend/src/components/TypeView/PainelSearchShell/{DynamicFilter.tsx,FilterSelect.tsx,filters.ts}`
  (nunca conectados a nenhum módulo real).
- [ ] Rodar `npx knip` no frontend (já é devDependency) para achar o resto do código
  morto que não foi listado aqui e decidir numa penada o que apagar.
- [ ] Reescrever `frontend/src/modules/roles/README.md` (hoje é a cópia não editada do
  `_template/README.md`) para descrever o módulo `roles` de fato.
- [ ] Corrigir a seção de testes do `frontend/README.md` — hoje descreve
  `frontend/tests/` e `npm test` que não existem. Ou implementa (ver P6) ou remove a
  promessa até implementar.
- [ ] Revisar `backend/issues.md` e o "Estado atual / pendências" de
  `frontend/src/modules/develop/*` item a item contra o código atual; corrigir o que
  já foi resolvido e decidir se esses documentos continuam existindo ou são aposentados
  em favor deste `PLAN.md` como fonte única de status corrente.

---

## P4 — Acabamento visual ("cara de projeto pronto")

O núcleo (TypeView/DetailView: listas, formulários, abas de relação, auditoria) já é
consistente e usa os tokens shadcn com dark mode. As bordas do app ficaram numa geração
visual anterior — é isso que fica exposto primeiro para quem olha o produto.

- [ ] Migrar `frontend/src/app/page.tsx` (landing) e
  `frontend/src/app/(public)/auth/**` de `bg-zinc-*`/`text-zinc-*` hardcoded para os
  tokens semânticos (`bg-background`/`text-foreground`/etc.) — hoje quebram no dark mode.
- [ ] Adicionar as primitivas shadcn que faltam: `Dialog`, `DropdownMenu`, `Avatar`,
  `Popover`, `Checkbox`, `Switch` (`npx shadcn add ...`).
- [ ] Substituir `frontend/src/components/RelationPicker/RelationPicker.tsx` (hoje
  `<div>`/`<table>` cru) por um `Dialog` + `Table` reais.
- [ ] Substituir `frontend/src/components/ui/toast.tsx` (hoje `bg-white` cru) pelo
  componente de toast do shadcn.
- [ ] Depois dos dois itens acima, migrar os 3 consumidores restantes de
  `frontend/src/components/shells/{RelationShell,PainelSearchShell}.tsx`
  (`audit/page.tsx` e as páginas de auth) para os shells atuais em `core/`/`TypeView`,
  e então apagar os shells legados.
- [ ] Dar cor à paleta de gráfico — `--chart-1..5` em `globals.css` hoje são cinza
  puro (`neutral`), sem nenhuma cor de marca.
- [ ] Construir um indicador de tenant/usuário atual na `AppTopbar`/`AppSidebar` — hoje
  não existe avatar, nome de usuário nem nome do tenant em nenhum lugar da UI.
- [ ] Construir a UI de troca de tenant — `setCurrentTenantId()` já existe no
  `auth-context.tsx` e grava o cookie `session_tenant`, só falta o componente (dropdown)
  que chama essa função fora do fluxo de login.

---

## P5 — Módulos parcialmente wireados (decisão + fechamento)

- [ ] **Módulo `task`.** Existe no backend (`backend/src/modules/task/`) e já está
  referenciado em `frontend/src/lib/authz.ts` e `AppSidebar.tsx` (ícone, regras de
  rota/permissão) — mas não existe `frontend/src/modules/tasks/` nenhum, e o import
  está comentado em `lib/registry/bootstrap.ts`. Hoje é um link morto no menu para
  qualquer usuário com `task.read`. Decidir: completar o módulo frontend (seguindo o
  padrão de `favorites`) ou remover as referências de `authz.ts`/sidebar até decidir.
- [ ] **Views ausentes do `ViewSwitcher`.** `Kanban` e `Calendar` aparecem no mapa de
  ícones do `ViewSwitcher.tsx` mas não têm componente nenhum implementado. Decidir:
  implementar (ver Fase 5 do `AGENTS.md`) ou remover do switcher até existir.
- [ ] **Cobertura de views por módulo.** Só `favorites` usa `cards`/`graph`; roles,
  users, tenants, permissions só têm `list`+`form`. Decidir se isso é intencional
  (documentar como padrão) ou se outros módulos ganham mais views.

---

## P6 — Infraestrutura de template (Fase 1 do `AGENTS.md`, ainda não iniciada)

- [ ] `docker-compose.yml` (Postgres) na raiz + `Dockerfile` para `backend/` e
  `frontend/` — hoje não existe nenhum dos dois em lugar nenhum do repo.
- [ ] CI (`.github/workflows/ci.yml`): hoje só roda `test` do backend + `build` do
  frontend + export do OpenAPI. Adicionar lint (`eslint`) e `tsc --noEmit` nos dois
  projetos, e um job de e2e com Postgres em service container.
- [ ] **Corrigir `backend/test/roles.attach-detach.e2e-spec.ts` (pré-existente, 4/4
  falhando — achado ao rodar `npm run test:e2e` durante o P1).** Só sobrescreve
  `RolesPermissionsGuard`; o `AuthGuard` global (via `AuthModule`, carregado
  transitivamente por `RoleModule`) bloqueia a requisição antes — provável que falte
  `.overrideGuard(AuthGuard).useValue({ canActivate: () => true })` no setup do teste,
  igual ao `user-tenant-isolation.e2e-spec.ts` novo faz implicitamente ao não importar
  `AuthModule`. Confirmado via `git stash` que a falha já existia antes do P1, não é
  regressão. Corrigir isso é pré-requisito para ligar `test:e2e` no CI (item acima).
- [ ] **`npm audit` (ou Dependabot com alertas de segurança) no CI.** O levantamento do
  bloco P0 foi manual — adicionar um job que rode `npm audit` nos dois projetos (ou
  habilitar os alertas de segurança do Dependabot) para a próxima leva de
  vulnerabilidades não depender de uma auditoria manual de novo.
- [ ] `.nvmrc` + `engines` no `package.json` de cada app + Dependabot (`.github/dependabot.yml`)
  agrupado para patch/minor.
- [ ] Corrigir `frontend/eslint.config.mjs` — o objeto `rules` está dentro de
  `globalIgnores` por engano (bug já listado no `AGENTS.md` Fase 1) — e, depois de
  corrigido, ativar a verificação por lint das fronteiras de import
  `core`/`platform`/`modules` da seção 3.4 do `AGENTS.md`.
- [ ] Implementar os testes de frontend que o `frontend/README.md` promete (auth,
  tenant scope, guards RBAC) — ou formalizar que eles ficam para depois da Fase 5/6 e
  ajustar a documentação enquanto isso (ver item correspondente em P3).

---

## Como usar este arquivo

- Cada `[ ]` é um passo pensado para ser pequeno e commitável sozinho — não é uma
  tarefa de várias horas escondida atrás de uma linha.
- Trabalhar os blocos **em ordem** (P0 antes de P1, P1 antes de P2, etc.) a não ser que
  haja um motivo explícito para inverter — vulnerabilidades e segurança de tenant vêm
  antes de consistência, que vem antes de limpeza, que vem antes de polimento visual.
- Ao concluir um item, marcar `[x]` e, se a mudança for uma decisão arquitetural (não
  só uma correção mecânica), registrar num ADR em `docs/adr/`.
- Se este arquivo ficar "cheio demais" de itens concluídos, mover os concluídos para
  `docs/features/Completo/` ou para um changelog, para o PLAN.md continuar enxuto e
  fácil de escanear — o objetivo é nunca deixá-lo virar outro `issues.md` desatualizado.
