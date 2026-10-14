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

### Checkpoint desta rodada (P1)

`npx tsc --noEmit` (só os 3 erros pré-existentes, já documentados no P0, sem relação
com este trabalho), `npm test` (59/59), `npx jest --config ./test/jest-e2e.json
user-tenant-isolation` (5/5), `npm run build` — todos limpos nos dois módulos tocados
(backend apenas; esta rodada não exigiu nenhuma mudança no frontend).

---

## P2 — Consistência de auditoria e sessão — quase todo feito em 2026-10-13

- [x] **Dois registros de "interceptor global" em lugares diferentes.**
  `AllExceptionsFilter` e `AuditInterceptor` saíram do registro imperativo em
  `main.ts` (`app.useGlobalFilters`/`app.useGlobalInterceptors`) e passaram a ser
  `APP_FILTER`/`APP_INTERCEPTOR` em `app.module.ts`, ao lado do `LoggingInterceptor`
  que já estava lá. Todo comportamento "global" do HTTP (exceto `AuthGuard`, que é
  `APP_GUARD` dentro do próprio `AuthModule` — faz sentido ficar junto da feature que
  o define) agora se vê num único lugar.
- [x] **Erros somem do log.** `AllExceptionsFilter` agora loga toda exceção antes de
  responder: `HttpException` (erro de negócio esperado) em `warn`, qualquer outra coisa
  (bug real) em `error` com stack trace. `LoggingInterceptor` ganhou `catchError()` ao
  lado do `tap()` que já existia — antes só sucesso gerava linha de log, agora erro
  também, com o status code certo (da `HttpException` ou 500). Specs novos para os
  dois (`all-exceptions.filter.spec.ts`, `logging.interceptor.spec.ts` — nenhum
  existia antes).
- [x] **Auditoria: "after", "type" e "before" real — tudo corrigido.**
  `AuditInterceptor` registrava `payload: body` (o que o cliente mandou) como
  "after" — agora registra o `result` do handler (o que foi efetivamente
  persistido/retornado). `type` era sempre `'DATA_CHANGE'` fixo — agora
  `resolveAuditType()` resolve `LOGIN`/`LOGOUT` pela URL de auth e
  `PERMISSION_CHANGE` para attach/detach de role (`/roles/:id/users`,
  `/roles/:id/permissions`), mantendo `DATA_CHANGE` só para CRUD comum.
  **"Before" real implementado** (decisão do usuário: dispatch dinâmico no
  interceptor, não Prisma Client Extension) — antes de chamar `next.handle()`,
  `captureBeforeState()` busca a entidade via
  `(this.prisma as any)[entity].findUnique({ where: { id: entityId } })`, usando o
  mesmo `entity`/`entityId` que o interceptor já calculava; não faz nada para
  `POST` (create não tem "antes") nem quando o nome do recurso não bate com um
  delegate real do Prisma (ex. `audit`); qualquer erro de leitura cai em try/catch e
  não derruba a requisição principal. `AuditService.register` ganhou os parâmetros
  `type`/`before`. `audit.interceptor.spec.ts` (13 casos, não existia nenhum antes
  desta rodada) cobre "after"=resultado persistido, as 4 variações de `type`, e 5
  cenários de "before" (captura real, não busca em POST, sem delegate, erro de
  leitura não derruba o request, erro do handler em si ainda propaga normalmente).
  **Validado contra Postgres real** (ver nota sobre processo parado, abaixo): um
  `PATCH` de usuário real gravou um registro de auditoria com `before` e `after`
  completos (senha redigida nos dois), lado a lado com um registro antigo (da
  mesma sessão, antes da correção) que ainda mostrava `before: null` — a diferença
  de comportamento fica visível no próprio banco.
- [x] **Refresh de sessão — bug real encontrado e corrigido, validado de ponta a
  ponta contra o Postgres local + servidores reais.** O Nest nunca manda
  `refresh_token` no corpo JSON de `/auth/login`, `/auth/register`, `/auth/refresh`
  (só via `Set-Cookie` — `AuthController` sempre desestrutura `refresh_token` fora do
  payload público antes de responder). `loginWithCredentials` (`lib/auth-login.ts`),
  `api/auth/refresh/route.ts` e `api/auth/register/route.ts` liam
  `payload.refresh_token` do corpo — sempre `undefined`, então todo login/registro/
  refresh gravava o cookie `refresh_token` com um valor inválido. Corrigido com
  `extractSetCookieValue()` (novo, em `lib/session.ts`), que lê o valor certo do
  header `Set-Cookie` da resposta do Nest, como o `AGENTS.md` já pedia
  (`headers.getSetCookie()`). De bônus, `api/auth/refresh/route.ts` também mandava
  `Content-Type: application/json` sem nenhum body nessa chamada — o Nest rejeitava
  com 400 antes de processar o refresh, quebrando o fluxo inteiro; removido. Validado
  rodando os dois servidores reais (backend com Postgres local, frontend) e fazendo
  login → refresh → requisição autenticada via `curl` com cookie jar — os três passos
  funcionam e o `refresh_token` rotaciona corretamente a cada chamada.
  **A parte de "ler o `exp` do JWT e renovar antes de expirar" (proativo, não só
  reativo a 401) não foi implementada** — também é uma decisão em aberto (ver seção
  final): hoje não existe `middleware.ts` no projeto, e é aí que esse refresh
  proativo precisaria rodar para valer para todas as rotas.

### Checkpoint desta rodada (P2)

Backend: `tsc --noEmit` (só os 3 erros pré-existentes já conhecidos), `npm test`
(77/77), `npm run build`. Frontend: `tsc --noEmit` limpo, `npm run build` limpo, e
verificação end-to-end real (backend + frontend rodando, Postgres local) do fluxo de
login/refresh/requisição autenticada via `curl`.

**Achado durante a verificação, vale saber:** a porta 5000 tinha um processo `node
dist/src/main` de pé desde bem antes desta sessão (não é `--watch`, não recarrega
sozinho) — a primeira tentativa de validar o "before" da auditoria bateu nesse
processo parado e pareceu não ter funcionado. Confirmado comparando os dois registros
de auditoria lado a lado no banco (um antigo, do processo parado, com `before: null`;
um novo, de uma instância isolada que subi numa porta separada sem tocar na
existente, com `before` completo). Esse processo antigo em 5000 **não foi encerrado**
— se for seu, ele vai continuar servindo código de antes de hoje até você reiniciá-lo
manualmente (`npm run build && npm run start:dev` ou similar) para pegar tudo que foi
corrigido em P0/P1/P2.

---

## P3 — Limpeza de código morto e reconciliação de documentação — ✅ feito em 2026-10-13

- [x] Removidos `frontend/src/modules/favorites/actions/actions.ts` e
  `constants/constants.ts` (órfãos) — e as duas pastas, que ficaram vazias.
- [x] Removido `frontend/src/modules/roles/components/Forms.ts` (0 bytes).
- [x] Removido `frontend/src/modules/roles/config/client-actions.ts`.
  **Achado ao comparar de verdade**: não era byte a byte idêntico a
  `actions/roleService.ts` como a entrada original deste item supunha —
  `roleService.ts` (o usado pelos componentes) tinha validações extras de
  `tenantId` que `client-actions.ts` não tinha. Reforça que era mesmo o rascunho
  mais antigo/incompleto, não o contrário.
- [x] Removidos `frontend/src/lib/query-state/favorites-query-state.ts` e o trio
  `frontend/src/components/TypeView/PainelSearchShell/{DynamicFilter.tsx,FilterSelect.tsx,filters.ts}`
  (confirmado isolado — só se importavam entre si, nada de fora os usava) — e a
  pasta `PainelSearchShell/`, que ficou vazia.
- [x] **`npx knip` rodado — achou mais 5 arquivos mortos** que não estavam listados
  originalmente aqui, todos confirmados sem uso e removidos: `TypeView/TextView/TextView.tsx`
  (debug — `JSON.stringify` cru, nunca usado em nenhum `listLayout` real),
  `components/ui/SearchInput.tsx` (órfão isolado do mesmo cluster do item acima),
  `modules/permissions/components/columns.ts`, `types/async-state.ts`, e **toda a
  pasta `src/features/auth/`** (3 arquivos — o último resquício da arquitetura
  pré-rewrite `features/`, que o projeto já tinha migrado para `modules/` desde o
  commit `b28989d`; a pasta `features/` inteira deixou de existir no repo). `knip`
  também achou 2 dependências não usadas removidas do `package.json`
  (`lucide` — sobrava `lucide-react`; `ts-morph` — só usado transitivamente pelo
  `shadcn` CLI) e 1 dependência usada mas não declarada, adicionada
  (`@radix-ui/react-toast`, resolvia via `radix-ui` mas não estava explícita).
  **Decisão consciente de não remover**: `components/ui/item.tsx` e
  `components/ui/menubar.tsx` (primitivas do shadcn sem uso ainda — fazem parte do
  design system, não "código morto" custom; `knip` também lista dezenas de
  "unused exports" nos componentes `ui/*` e vários pares `X|default` — são ruído
  esperado de barrel files e de componentes de design system com API maior que o
  uso atual, não itens para apagar).
- [x] Reescrito `frontend/src/modules/roles/README.md` — descreve a estrutura real
  do módulo (`contract.tsx`/`provider.ts`/`actions/roleService.ts`, as duas relações
  N:N, por que só o lado Role é editável), em vez da cópia não editada do
  `_template/README.md`.
- [x] Reescrito `frontend/README.md` por completo — não era só a seção de testes que
  estava desatualizada: rotas `/main/*` (pré-rewrite), "arquitetura por features",
  link para `SCREENS_UPDATES.md` (não existe), paths antigos de componentes. Agora
  reflete a estrutura `src/app/(app)/`, `src/modules/`, aponta para `/develop` como
  guia vivo, e diz honestamente que não há testes automatizados no frontend ainda em
  vez de prometer `frontend/tests/`.
- [x] **"Estado atual / pendências" do `frontend/src/modules/develop/part4-referencia.tsx`
  também revisado** (não estava no checklist original, mas é o mesmo tipo de
  documento desatualizado — ver próximo item do P3) — 4 dos 7 itens antigos já
  resolvidos, lista reduzida a 3 itens genuinamente pendentes.
- [x] **Revisado item a item contra o código atual.** `backend/issues.md`: 4 dos 6
  milestones que ele descrevia já estavam resolvidos ou tinham sido corrigidos no
  P1/P2 desta sessão (Tenant Isolation, Audit Hardening/before-after); o próprio
  "Refresh Token ✅ 3/3 completo" estava **errado** — o P2 achou e corrigiu 2 bugs
  reais nesse fluxo. Os itens genuinamente pendentes (RLS, cache Redis,
  observabilidade/correlation-id, auditoria de 401/403, guard global) foram
  migrados para o novo bloco **P7** abaixo; o arquivo em si foi **aposentado**
  (substituído por um ponteiro para este `PLAN.md`) — manter duas listas de
  pendência em paralelo é exatamente o problema que o fez ficar desatualizado.
  "Estado atual / pendências" do `frontend/src/modules/develop/part4-referencia.tsx`:
  4 dos 7 itens antigos já estavam resolvidos (inclusive um resolvido na direção
  oposta à descrita — `client-actions.ts` foi removido, não promovido); corrigido
  para refletir a realidade, com os 3 itens genuinamente pendentes mantidos lá
  (são específicos da UI, cabe melhor nesse guia do que neste `PLAN.md`).

### Checkpoint desta rodada (P3)

`npx tsc --noEmit` limpo, `npm run build` limpo, `npx knip` reduzido a só os 2
primitivos do shadcn sem uso (decisão consciente, não é pendência) e ao
`server-only` "unlisted" (falso positivo — vem embutido no próprio Next.js, não é
uma dependência de fato ausente). Smoke manual da rota `/develop` (onde o JSX do
"Estado atual" foi editado) confirmando que ainda compila e redireciona
normalmente para quem não está autenticado.

---

## P4 — Acabamento visual ("cara de projeto pronto") — ✅ feito em 2026-10-13/14 (8 de 8)

O núcleo (TypeView/DetailView: listas, formulários, abas de relação, auditoria) já é
consistente e usa os tokens shadcn com dark mode. As bordas do app ficaram numa geração
visual anterior — é isso que fica exposto primeiro para quem olha o produto.

- [x] **Landing + páginas de auth migradas.** `app/page.tsx` reescrita com `Button`/
  `Image` reais em vez de `<a>`/`<img>` cravados; `(public)/auth/{login,register}/page.tsx`
  trocaram `bg-zinc-*`/`text-zinc-*`/`border-red-300` por `bg-background`/`text-foreground`/
  `text-muted-foreground`/`border-destructive`.
- [x] **Primitivas shadcn adicionadas**: `Dialog`, `DropdownMenu`, `Avatar`, `Popover`,
  `Checkbox`, `Switch`. **Achado durante a instalação**: o CLI gerou os 6 arquivos
  importando `cn` do pacote npm `"cn"` em vez de `@lib/utils` (o padrão usado por
  todo o resto do design system) — corrigido nos 6 arquivos, e a dependência `cn`
  (que não era usada por mais nada) removida do `package.json`.
- [x] **`RelationPicker.tsx` reescrito** com `Dialog`+`Table`+`Input`+`Button` reais —
  mesma lógica de busca/paginação/debounce de antes, só a casca trocou.
- [x] **Toast — não foi "substituir pelo toast do shadcn" porque esse componente foi
  descontinuado na versão atual do registry** (`npx shadcn add toast` recomenda
  explicitamente `sonner` agora). Adotado `sonner` + `<Toaster />` no layout raiz;
  os 3 consumidores (`RolePermissionsHost`, `RoleUsersHost`, `UserRolesHost`) trocaram
  `useToast().show({title,description})` por `toast(title, {description})` direto —
  mais simples, sem hook. `components/ui/toast.tsx` e a dependência
  `@radix-ui/react-toast` removidos.
- [x] **Shells legados migrados e removidos.** `audit/page.tsx` não só trocou de shell
  — foi reescrita para usar `TypeViewScreen` como todo módulo real (ela reimplementava
  manualmente, com um `PainelSearchShell` ad-hoc, algo que o módulo `audit` já tinha
  registrado e pronto para uso — `auditModule` existia e nunca era chamado).
  `SideShell` migrou para `components/Layout/SideShell.tsx` (tokens atuais, virou
  Server Component — não tinha nenhuma interatividade que justificasse `"use client"`).
  `RelationShell`/`PainelSearchShell` legados não tinham mais nenhum consumidor real
  (só o próprio barrel se auto-referenciando) — `components/shells/` inteiro removido.
  Corrigido de tabela: comentário desatualizado em `DetailView.tsx` e `table.tsx`
  (primitiva compartilhada) tinha as mesmas cores `zinc-*` cravadas — achado ao
  trabalhar na mesma área, corrigido para `bg-muted`/`text-muted-foreground`/`border-border`.
- [x] **Paleta do gráfico colorida — usando o skill `dataviz`.** Carreguei o skill antes
  de editar (ele exige isso para qualquer escolha de cor de gráfico). Os 5 slots
  `--chart-1..5` passaram da escala de cinza puro para os 5 primeiros tons da paleta
  categórica validada do skill (blue/orange/aqua/yellow/magenta), com passos
  diferentes para claro/escuro. Validado com `scripts/validate_palette.js` nos dois
  modos antes de aplicar (todos os checks de CVD/contraste passam). Como o único
  gráfico do projeto (`GraphView`) é de série única, a legenda não é necessária (regra
  do skill: 1 série não precisa de legenda) — já tem tooltip ao passar o mouse.
- [x] **Indicador de usuário/tenant construído e validado contra servidor real.**
  `(app)/layout.tsx` busca o nome do tenant (`tenant.legalName`, que não vem no JWT/
  perfil, só o id) com fallback silencioso — um usuário recém-criado sem role
  atribuída ainda não tem `tenant.read`, e a sidebar não deve quebrar por isso.
  `AppSidebar` ganhou um footer com `Avatar` (iniciais do e-mail) + `DropdownMenu`
  mostrando e-mail/tenant e a ação "Sair" (antes era só um botão solto). Validado
  fazendo login de verdade contra Postgres local e inspecionando o HTML renderizado —
  ver "achado" abaixo.
- [x] **UI de troca de tenant — removida do backlog (decisão do usuário, 2026-10-14).**
  `ADR 0002` já decidiu que um usuário pertence a exatamente um tenant (`User.email`
  é único na plataforma inteira exatamente por isso) — não há, no modelo de domínio
  atual, um usuário com acesso a múltiplos tenants para "trocar" entre eles. O item
  era um mal-entendido de uma versão anterior do domínio, não um requisito real.
  Nenhum código foi tocado (`setCurrentTenantId`/`session_tenant` continuam como
  estão — servem para fixar o tenant do JWT após login/registro, não para trocar em
  sessão). Se um caso de uso real de múltiplos tenants por usuário surgir no futuro,
  isso é uma mudança de modelo de domínio que contradiz o ADR 0002 — entra como ADR
  novo, não como retomada deste item.

### Achado desta rodada: servidor de dev desincronizado após muitas edições rápidas

Ao validar o indicador de usuário/tenant pela primeira vez, o HTML renderizado não
tinha o `DropdownMenu`/`Avatar` novo — só o botão antigo. Não era bug no código: o
servidor de dev do frontend (rodando desde o início da sessão, sobrevivendo a dezenas
de edições rápidas em sequência) tinha o Turbopack com o HMR desincronizado. Reiniciar
os dois servidores do zero resolveu — o HTML passou a mostrar `admin@exemplo.com` e
`Test Tenant` corretamente no footer da sidebar. **Lição**: depois de uma sequência
longa de edições, reiniciar o dev server antes de validar visualmente, em vez de
confiar no HMR para ter acompanhado tudo.

### Checkpoint desta rodada (P4)

Frontend: `tsc --noEmit` limpo, `npm run build` limpo, `npx knip` sem novidade (só os
5 primitivos do shadcn sem uso ainda — decisão consciente — e o `server-only` "unlisted"
já conhecido). Backend: `tsc`/`test` (77/77) confirmados intactos (nenhum arquivo de
backend tocado neste bloco). Validação end-to-end real: login + GET `/dashboard` contra
Postgres local e servidores recém-reiniciados, confirmando o indicador de usuário/tenant
no HTML. **Não verificado**: cliques reais no `Dialog` do `RelationPicker` e nos toasts
do `sonner` num navegador — esta sessão não tem uma ferramenta de automação de
navegador; recomendo um teste manual rápido do fluxo "anexar permissão a um role" antes
de considerar este bloco 100% fechado.

---

## P5 — Módulos parcialmente wireados (decisão + fechamento) — ✅ feito em 2026-10-14

Três decisões de escopo, todas confirmadas com o usuário antes de agir (nenhuma delas
era uma correção mecânica):

- [x] **Módulo `task` — referências removidas, não completado.** Decisão: o
  `AGENTS.md` (Fase 2) já planeja remover `Task` do schema junto com as outras
  entidades específicas de ONG (`Person`, `Address`, `Contact`, `Report`) quando o
  template for limpo — completar o módulo frontend agora seria esforço descartado
  antes mesmo de existir. Removido: a entrada `tasks` de `RouteAccessMeta`/
  `ROUTE_RULES`/`ACTION_PERMISSION_RULES` em `lib/authz.ts`, a entrada `tasks` de
  `MODULE_ICONS` (e o import agora não usado do ícone `CheckSquare2`) em
  `AppSidebar.tsx`, e a linha comentada `// import "@modules/tasks/config/contract"`
  em `lib/registry/bootstrap.ts` (contradizia o próprio comentário do arquivo, que diz
  "cada linha aqui é uma feature existente"). O link morto no menu deixa de existir;
  o destino do módulo backend fica para quando a Fase 2 do `AGENTS.md` for executada.
- [x] **Views Kanban/Calendar removidas do `ViewSwitcher` — e mais uma achada no
  processo.** Decisão: são Fase 5 do `AGENTS.md`, ainda não chegou a vez — um ícone
  no switcher sem componente por trás é uma promessa vazia na UI. Ao olhar o
  `ICON_BY_VIEW` de `ViewSwitcher.tsx` percebi que **`timeline` estava no mesmo caso**
  (nenhum módulo declara essa view) e que **`text` também ficou órfão** depois que o
  P3 removeu `TypeView/TextView/TextView.tsx` como código morto — os três removidos
  juntos, com um comentário apontando para a Fase 5 e para onde checar quais views
  são reais (`views:` de cada `modules/*/config/contract.tsx`).
- [x] **Cobertura de views por módulo — documentada como intencional.** Decisão:
  não padronizar `cards`/`graph` nos outros módulos só porque `favorites` tem.
  Adicionado um `DocCallout` em `modules/develop/content/part3-modulos.tsx` (guia de
  criação de módulo), logo depois do exemplo de `contract.tsx`, explicando que
  `views` é uma escolha por módulo — view nova só quando o domínio daquele módulo
  realmente pede, não para "ficar igual".

### Checkpoint desta rodada (P5)

`npx tsc --noEmit` limpo, `npm run build` limpo (sem rota `/tasks`, como esperado),
`npx knip` sem regressão (mesmo baseline de antes — nenhum arquivo novo ficou morto).
Os servidores de dev desta sessão já tinham caído entre as rodadas anteriores e esta;
como as mudanças aqui são só remoção de entradas de configuração (sem lógica nova),
o build limpo foi considerado suficiente — não reiniciei os servidores só para esta
rodada.

---

## P6 — Infraestrutura de template (Fase 1 do `AGENTS.md`) — ✅ feito em 2026-10-14

- [x] **`docker-compose.yml` (raiz) + `Dockerfile` em `backend/` e `frontend/`.**
  Multi-stage (`deps` → `build` → `runtime`), Node 26 Alpine. Backend: sem passo de
  binário nativo de query engine porque usa driver adapter (`@prisma/adapter-pg`);
  `bcrypt` tem binding nativo, então a imagem instala `python3 make g++` na fase
  `deps` para compilar na hora caso não haja binário pronto pra essa combinação de
  Node/arch. Frontend: usa `output: "standalone"` (novo em `next.config.ts`) para a
  imagem final não levar `node_modules` inteiro. `docker-compose.yml` sobe Postgres
  17 com healthcheck + os dois serviços apontando um para o outro pelo hostname
  interno do compose. `.dockerignore` em cada app. **Ressalva importante: Docker não
  está instalado neste ambiente de desenvolvimento — nenhum `docker build`/`docker
  compose up` real foi executado.** A verificação foi por equivalência: `npm ci
  --omit=dev` isolado (ver achado de dependências abaixo), caminho de build
  (`dist/src/main.js`, `.next/standalone/server.js`) confirmado por `npm run build`,
  parse do `docker-compose.yml` via `js-yaml`. Antes de confiar na imagem em
  produção, rodar `docker compose up --build` uma vez para validar de verdade.
- [x] **`backend/package.json`: `pg`, `@prisma/client`, `@prisma/adapter-pg` estavam
  em `devDependencies`**, mas são usados em runtime (`PrismaService` constrói
  `new PrismaPg(...)`; o client gerado importa `@prisma/client/runtime/client`).
  Um `npm ci --omit=dev` de produção ficaria sem os três. Movidos para
  `dependencies`; confirmado corrigido com `npm ci --omit=dev` numa cópia isolada do
  `package.json`/`package-lock.json`.
- [x] **`backend/package.json`: `start:prod` apontava para `node dist/main`**, mas o
  build real sai em `dist/src/main.js` (estrutura do `rootDir` do `tsconfig`) — o
  script nunca funcionou. Corrigido para `node dist/src/main`; confirmado com
  `npm run start:prod` (bootstrap limpo).
- [x] **`backend/package.json`: `lint` tinha `--fix` embutido** — a mesma classe de
  problema que já tinha corrompido silenciosamente um type cast em
  `tenant.middleware.ts` no P0/P2. Separado em `lint` (sem `--fix`, seguro para CI) e
  `lint:fix` (novo script, uso manual).
- [x] **`backend/.env.example` reescrito** — tinha linhas soltas de comentário do
  SQLTools (`-- Active: ...`) e faltavam `COOKIE_SECRET`/`CORS_ORIGINS`, ambos lidos
  via `process.env` em `main.ts` mas nunca documentados.
- [x] **3 erros de `tsc --noEmit` pré-existentes no backend, corrigidos** (eram
  aceitos como ruído de fundo desde o P0): `permissions.controller.spec.ts` (literal
  `'READ'` sem `as const`, alargava para `string`), `roles.service.spec.ts` (`type:
  'SYSTEM'` não existe no enum `RoleType`, só `ADMIN | USER | GUEST`),
  `user.controller.spec.ts` (`dto.tenantId` é opcional no DTO, mas o parâmetro do
  controller exige `string` — extraído um `tenantId` próprio no teste). Com isso,
  `tsc --noEmit` do backend virou um gate limpo o bastante para ser bloqueante no CI.
- [x] **Corrigido `backend/test/roles.attach-detach.e2e-spec.ts`** (pré-existente,
  falhava 4/4). Diagnóstico anterior (P1) estava errado: `RoleModule` não importa
  `AuthModule`, então sobrescrever `AuthGuard` não tinha efeito nenhum nesse grafo de
  módulo isolado. A causa real é o decorator `@TenantId()`, que lança
  `ForbiddenException` direto (não via guard) quando `request.user` não está
  definido. Corrigido populando `request.user` dentro do `RolesPermissionsGuard`
  sobrescrito — o único guard que de fato existe nesse teste. Confirmado 2x
  (4/4, depois 11/11 da suíte e2e completa) para descartar flakiness.
- [x] **Corrigido `frontend/eslint.config.mjs`** — o objeto `{ rules: {...} }` estava
  dentro do array de `globalIgnores([...])` em vez de ser um objeto de config
  separado, o que quebrava o ESLint por completo
  (`TypeError: Config 'globalIgnores 0': Key 'ignores': Expected array to only
  contain strings and functions`). **Isso significa que nenhuma regra de lint do
  frontend rodou de fato até agora** — nem a de fronteira `@/lib` → `@lib`, que já
  estava declarada desde antes. Corrigido; junto, ativada a regra de fronteira
  `core/` não pode importar de `modules/`/`platform/` (AGENTS.md §3.4) — hoje inerte,
  porque `src/core/` e `src/platform/` ainda não existem no frontend, mas já fica
  pronta para quando existirem.
- [x] **132 violações de lint ficaram visíveis** ao corrigir o crash acima. 77 eram
  `@/lib`/`@/modules`/`@/components` em vez de `@lib`/`@modules`/`@components`
  (aliases resolvem para o mesmo caminho no `tsconfig.json` — troca cosmética seguro)
  — corrigidas via substituição em 41 arquivos. As 55 restantes (no-explicit-any: 17,
  no-unused-vars: 16, exhaustive-deps: 5, no-unescaped-entities: 4,
  static-components: 4, incompatible-library: 3, set-state-in-effect: 3,
  prefer-const: 2, preserve-manual-memoization: 1) **não foram corrigidas** —
  documentadas aqui como débito separado, mesmo julgamento já aplicado aos 289 erros
  de lint do backend no P0. Um dos `static-components` sinaliza um "Cannot create
  components during render" genuíno em `UserRolesHost.tsx`/hosts de relação
  parecidos — candidato a tarefa própria futura, não corrigido agora.
- [x] **CI (`.github/workflows/ci.yml`) reescrito por completo.** Antes: Node 20
  fixo em 3 lugares, só 3 jobs (`backend-tests`, `frontend-build`,
  `export-openapi`), sem lint, sem `tsc --noEmit`, sem e2e. Agora, 5 jobs:
  `backend-checks` (lint não-bloqueante + `tsc --noEmit` bloqueante + testes
  unitários), `backend-e2e` (Postgres em service container + `prisma migrate deploy`
  seguido de `test:e2e`), `frontend-checks` (lint não-bloqueante + `tsc --noEmit`
  bloqueante + **testes unitários, novo** + build), `security-audit` (`npm audit
  --audit-level=high` nos dois projetos, não-bloqueante) e `export-openapi`.
  `node-version-file: .nvmrc` em todo job (elimina a duplicação de versão fixa). Lint
  fica `continue-on-error: true` nos dois projetos de propósito — 289 erros no
  backend / 55 no frontend são débito pré-existente grande o bastante para tornar o
  gate vermelho desde o primeiro commit (sem sinal, só ruído); vira bloqueante quando
  esse débito for zerado. `tsc --noEmit` é bloqueante nos dois, porque os dois
  chegaram a zero erro nesta rodada.
- [x] **`.nvmrc`** (`26`) + `"engines": { "node": ">=26.0.0" }` em
  `backend/package.json` e `frontend/package.json`.
- [x] **`.github/dependabot.yml`** — `npm` para `backend/` e `frontend/` (grupo
  `patch-and-minor`, semanal) + `github-actions` na raiz. Majors ficam fora do grupo
  de propósito — AGENTS.md §6.1 pede PR isolada por major (`chore/upgrade-<pacote>-<versão>`),
  nunca em lote.
- [x] **Testes de frontend mínimos implementados** (auth, isolamento de tenant,
  guards RBAC) — zero dependência de teste existia até agora. Escolhido **Vitest**
  (não Jest): o projeto não tinha nenhum test runner configurado, e Vitest integra
  nativamente com o Vite/esbuild que o Next.js 16 já usa por baixo, roda mais rápido
  e evita a camada extra de configuração que Jest precisa pra ESM/App Router. Stack:
  `vitest` + `@vitejs/plugin-react` + `jsdom` + `@testing-library/react`/`jest-dom`.
  `vitest.config.mts` replica os aliases do `tsconfig.json`; `globals` fica
  desligado (imports explícitos de `describe/it/expect/vi`, no mesmo espírito do
  padrão de teste já usado no backend) — por isso o cleanup do Testing Library entre
  testes precisou ser registrado manualmente em `vitest.setup.ts` (ele depende de um
  `afterEach` global pra se auto-registrar). Três arquivos, 13 testes:
  - `src/lib/authz.test.ts` — funções puras de RBAC por rota/ação
    (`canAccessRoute`/`resolveRoutePermission`/`canAccessAction`), sem mock nenhum.
  - `src/components/auth/AppAccessGuard.test.tsx` — o guard de RBAC que bloqueia
    conteúdo de rota sem a permissão exigida; `next/navigation` mockado via
    `vi.mock`.
  - `src/contexts/auth-context.test.tsx` — `AuthProvider`/`useAuth`: `hasRole`/
    `hasPermission` a partir do usuário logado, e isolamento de tenant
    (`signIn` adota o `tenant.id` devolvido pelo backend, nunca um valor do
    cliente; `setCurrentTenantId(null)` limpa estado + cookie `session_tenant`).
  `npm run test` (novo script, `vitest run`) roda no CI dentro de `frontend-checks`,
  antes do build. `frontend/README.md` atualizado para descrever o runner e a
  cobertura atual em vez do antigo "não há testes automatizados" (texto do P3).
- [x] **`frontend/package.json`: `@types/node` estava em `^20`**, incompatível com o
  `engines.node >=26.0.0` já declarado e com o peer requirement do `vitest@5`
  (`@types/node ^22 || >=24`). Bump para `^26` (mesma major do Node já fixado em
  `.nvmrc`).
- [x] **`frontend/.env.example`/`.env.production`: removida `NEXT_PUBLIC_API_URL`**
  (zero usos no código — confirmado por busca no repo inteiro).

### Checkpoint desta rodada (P6)

- Backend: `tsc --noEmit` limpo, `npm test` → 77/77, `npm run build` limpo,
  `npm run test:e2e` → 4 suítes / 11 testes, todos passando.
- Frontend: `tsc --noEmit` limpo, `npx vitest run` → 3 arquivos / 13 testes
  passando, `npm run build` limpo (19 rotas geradas, sem erro).
- `docker-compose.yml`, `.github/workflows/ci.yml` e `.github/dependabot.yml`
  validados por parse YAML (`js-yaml`) — não por execução real (Docker/Actions
  indisponíveis neste ambiente).

---

## P7 — Observabilidade e segurança adicional do backend (migrado de `backend/issues.md`, agora retirado) — 1 de 5 itens feito

`backend/issues.md` foi retirado no P3 (estava desatualizado desde 07/07 — vários
itens que ele listava como pendentes já tinham sido corrigidos pelo P1/P2 desta
sessão). Os itens dele que **ainda são reais** e não tinham equivalente neste
`PLAN.md` foram migrados para aqui, em vez de perdidos:

- [x] **`TenantScopeGuard` global — ✅ feito em 2026-10-14.** Registrado como
  `APP_GUARD` em `auth.module.ts`, logo depois do `AuthGuard` no array de
  `providers` (a ordem importa: este guard lê `request.user.tenantId`, que só
  existe depois do `AuthGuard` rodar — múltiplos `APP_GUARD` no mesmo array de
  providers executam na ordem declarada).
  - **Achado ao investigar**: já existia um `TenantMiddleware`
    (`core/common/middleware/tenant.middleware.ts`), mas aplicado só às rotas com
    prefixo de path `tenant/:tenantId/*` (`TenantController`, `TaskController`,
    `AuditController`) via `consumer.forRoutes(...)` no `app.module.ts` — ele
    decodifica o JWT direto (roda antes de guards no pipeline do Nest) e seta
    `request.tenantId`. Os demais controllers (`user`, `role`, `permission`,
    `favorites`, `favorite-notes`) não passam por nenhum middleware nem guard de
    tenant — a única defesa até agora era o decorator `@TenantId()` usado
    manualmente em cada parâmetro de handler, que não protege um handler novo
    que simplesmente esqueça de declarar esse parâmetro.
  - **O guard reescrito** (`tenant-scope.guard.ts`) agora: (1) recebe
    `Reflector` e pula completamente quando a rota é `@Public()` (lê o mesmo
    `IS_PUBLIC_KEY` que o `AuthGuard` já usa — não duplica o conceito com um
    decorator novo `@SkipTenantScope()`, que seria redundante já que toda rota
    sem usuário autenticado também não tem tenant); (2) fail-closed por padrão:
    antes só bloqueava quando a rota tinha `:tenantId` no path, agora exige
    `resolvedTenantId` (de `request.tenantId`, setado pelo middleware quando
    aplicável, ou `request.user.tenantId`, do JWT) em **toda** rota autenticada
    — seguro porque, no modelo de domínio atual, todo usuário pertence a
    exatamente um tenant e o JWT sempre carrega esse campo (confirmado em
    `auth.service.ts`); (3) **removida a leitura direta do header
    `x-tenant-id`** que existia como terceiro fallback — o guard antigo
    aceitava esse header como fonte de tenant quando `request.user` não estava
    setado, uma superfície de confiança desnecessária num valor controlado pelo
    cliente (reforça o princípio já documentado no AGENTS.md 3.2.1: o JWT é a
    única fonte confiável). `@TenantId()` (o param decorator, não tocado) ainda
    lê esse header como fallback só para o cenário dos testes isolados que não
    montam `AuthModule` — ver nota abaixo.
  - **Removido o `@UseGuards(TenantScopeGuard, ...)` redundante do
    `AuditController`** — como o guard é global agora, bastou manter
    `@UseGuards(RolesPermissionsGuard)`.
  - **Spec novo**: `tenant-scope.guard.spec.ts` (não existia nenhum), 6 casos —
    pula rota pública, bloqueia sem tenantId em nenhuma fonte, aceita
    `user.tenantId` do JWT, prioriza `request.tenantId` do middleware, bloqueia
    `:tenantId` da rota divergente do contexto, aceita quando bate.
  - **Validado contra servidor real** (não só mocks): subiu o backend local
    contra Postgres, registrou um tenant/usuário de teste via
    `POST /api/auth/register`, e confirmou com `curl` real: rota pública sem
    token → 200; rota protegida sem token → 401; rota protegida com token válido
    → 200; `GET /api/tenant/:tenantId/task` com o `:tenantId` correto → 200; o
    mesmo endpoint com `:tenantId` de **outro** tenant na URL → 403 "Acesso
    negado ao tenant" (o próprio guard global bloqueando); `GET /api/auth/profile`
    (autenticado, sem `:tenantId` no path) → 200, confirmando que o fail-closed
    não quebrou uma rota legítima sem tenant na URL.
  - **Nota sobre os testes e2e existentes**: `test/user-tenant-isolation.e2e-spec.ts`
    e `test/roles.attach-detach.e2e-spec.ts` montam só o módulo isolado
    (`UsersModule`/`RoleModule`), nunca `AuthModule` — então o guard global
    (registrado dentro do `AuthModule`) não entra nesse grafo de teste, e eles
    continuam simulando tenant via header `x-tenant-id` lido pelo
    `@TenantId()` decorator, como já faziam. Isso é intencional (testam
    isolamento de tenant na camada de serviço, não o guard), mas significa que
    a cobertura e2e do guard global em si veio só da validação manual acima +
    `app.e2e-spec.ts` (que monta o `AppModule` completo e confirma que `GET /`
    pública continua 200). Se quiser uma suíte e2e dedicada ao guard global
    (ex.: `tenant-scope.e2e-spec.ts` montando `AppModule` completo), fica como
    item pequeno separado — não fiz aqui para não misturar com o item do
    backlog.
- [ ] **RLS (Row-Level Security) no Postgres.** Nenhuma política de RLS existe hoje —
  o isolamento de tenant é 100% responsabilidade do código da aplicação (guards +
  checagem manual nos services). Exigiria `RequestContext` via `AsyncLocalStorage`
  propagando `tenantId`, `PrismaService` executando `SET LOCAL app.tenant_id` por
  request, e `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` nas tabelas
  multi-tenant — trabalho grande, mas é a camada de defesa que sobra se algum guard
  futuro falhar.
- [ ] **Cache Redis de permissões.** Hoje a lista de permissões vem inteira no JWT no
  login e só muda quando o token expira (15 min) — revogar uma permissão não tem
  efeito imediato. Cache Redis (TTL curto) + invalidação ao alterar
  role/permission resolveria isso sem token mais curto. `ioredis` nem está no
  `package.json` ainda.
- [ ] **Observabilidade estruturada.** `LoggingInterceptor`/`AllExceptionsFilter`
  (corrigidos no P2 para ao menos logar erro) ainda usam `console.log`/`Logger`
  simples — sem correlation-id propagado entre requisição→log→auditoria, sem
  logger estruturado (`pino`/`nestjs-pino`), sem OpenTelemetry. Um middleware de
  `AsyncLocalStorage` para correlation-id serviria tanto para isso quanto para RLS
  (item acima) — vale fazer junto.
- [ ] **Auditoria de falhas de autenticação/autorização (401/403).** `AuditInterceptor`
  só audita `POST`/`PATCH`/`DELETE` e login bem-sucedidos — uma tentativa de acesso
  negada (403 do `RolesPermissionsGuard`, 401 de token inválido) não gera nenhum
  registro hoje. Útil para detectar tentativa de escalonamento de privilégio.

---

## P8 — Padronização visual "comercial": correções de bugs — ✅ feito em 2026-10-14

Novo bloco, aberto a pedido do usuário: o visual do frontend está "muito simples" e
precisa de padronização comercial (formulários, drawers, tipografia) usando só
Tailwind + shadcn, sem libs novas fora desse ecossistema. Três investigações
exploratórias + um agente de planejamento mapearam o design system atual; o plano
completo (P8→P15) está registrado nas "Decisões já tomadas" abaixo. Este bloco é a
primeira fase — bugs de zero dependência, antes de qualquer trabalho de tokens/
componentes novos.

- [x] **Título vazio em toda tela de detalhe.** `src/screens/DetailViewScreen.tsx:27`
  passava `title={record?.title ?? ""}` para o `AppTopbar` — nenhuma entidade
  (`User`/`Role`/`Permission`/`Tenant`/`Favorite`) tem campo `title`, então o `<h1>`
  do topbar renderizava vazio em **todo** módulo. Corrigido para `title={mod.label}`,
  mesmo padrão já usado em `TypeViewScreen.tsx:29`.
- [x] **`title`/`description`/`toolbar` mortos em `DetailShell`.** `DetailShell.tsx`
  desestruturava os três props e nunca os usava no JSX — `toolbar` também não tinha
  nenhum consumidor real passando valor (grep vazio em todo `src/`). Removidos
  `title`/`description` de `DetailShell.tsx` e `DetailView.tsx` (dead code — o título
  da página já vive só no `AppTopbar` desde o fix acima). **`toolbar` foi mantido e
  religado**: agora renderiza de fato (`flex justify-end gap-2` acima do conteúdo),
  pronto para quando um botão de ação (ex.: excluir, que hoje não existe em lugar
  nenhum da UI) precisar de um lugar — não implementado ainda, só o slot ficou
  utilizável.
- [x] **`RelationShell` usando `Tabs` do shadcn.** O componente reimplementava tabs
  manualmente com `<button>`/`border-b-2` cravado — trocado por
  `Tabs`/`TabsList variant="line"`/`TabsTrigger`/`TabsContent` de
  `components/ui/tabs.tsx` (já instalado, zero uso real antes desta mudança). A
  variante `line` do `TabsList` foi escolhida porque reproduz visualmente o mesmo
  padrão de "sublinhado na aba ativa" que o markup manual já tinha — troca de casca,
  não de comportamento. API externa (`tabs: {key,label,content}[]`) mantida igual,
  nenhum módulo consumidor (`users`/`roles`/`permissions`/`tenants`) precisou mudar.
- [x] **`text-gray-700` cravado no `Label` do formulário de criação.** `FormView.tsx`
  passava `className="text-sm font-medium text-gray-700"` no `Label` — redundante
  (`text-sm font-medium` já é o default do componente, ver `components/ui/label.tsx`)
  e prejudicial (cor fixa, não token OKLCH, não respeita dark mode). Removido o
  `className` por completo.

### Checkpoint desta rodada (P8)

`tsc --noEmit` limpo, `npm run build` limpo (19 rotas), `npx vitest run` → 3/3
arquivos, 13/13 testes. **Validado contra servidores reais** (não só tipo/build):
subiu backend+frontend limpos (achou e matou dois processos zumbi de sessões
anteriores nas portas 3000/3001/5000 antes de subir — mesma classe de achado já
registrada no P2/P4), registrou um tenant/usuário de teste via
`POST /api/auth/register`, e confirmou no HTML real: `GET /users/:id` → `<h1>Users</h1>`
(antes vazio) + abas "Roles"/"Permissions" renderizadas via `data-slot="tabs-trigger"`
do shadcn; `GET /users?view=form` → labels "E-mail"/"Senha" via `data-slot="label"`,
zero ocorrência de `text-gray-700` no HTML, nenhum erro de aplicação em nenhuma das
duas páginas.

---

## P9 — Fundação de tokens (tipografia nomeada + espaçamento) — ✅ feito em 2026-10-14

- [x] **3 classes de hierarquia nomeadas em `globals.css`** (`@layer utilities`,
  depois do `@layer base`): `.text-page-title` (`text-lg font-semibold` — o `<h1>`
  do `AppTopbar`), `.text-section-title` (`text-base font-semibold` — cabeçalho de
  bloco lateral/card), `.text-label` (`text-sm font-medium` — já é o default do
  `Label` do shadcn, disponível para texto solto que precise da mesma hierarquia sem
  usar o componente). Valores escolhidos a partir do padrão já dominante no código,
  não inventados — é nomear o que já existia disperso, não redesenhar.
- [x] **Aplicado nos pontos divergentes identificados**: `AppTopbar.tsx` (`text-lg
  font-semibold` → `.text-page-title`), `SideShell.tsx` (`text-base font-semibold` →
  `.text-section-title`, usado hoje pelas páginas de login/register, não pelo
  `DetailView` como a investigação inicial supunha).
  **Achado não previsto, corrigido também aqui**: `PermissionsListView.tsx` tinha um
  `<h2>{formatMessage({id:"permission.title"})}</h2>` próprio — redundante, já que o
  `AppTopbar` da rota `/permissions` já mostra `mod.label` ("Permissions"). Nenhum
  outro módulo (`users`/`roles`/`tenants`, via `ListView.tsx` genérico) duplica o
  título dessa forma — confirmado por grep que `ListView.tsx` não tem `h1`/`h2`/`h3`
  nenhum. Removido o `<h2>` em vez de só trocar sua classe.
  **Decisão consciente de não alinhar**: `DocBlocks.tsx` (`DocSection`, `text-2xl
  font-bold tracking-tight`) foi deixado como está — é o título de seção de uma
  página de documentação/artigo (`/develop`), não uma tela de produto; forçá-lo a
  usar `.text-page-title` (menor) reduziria a hierarquia visual de um guia que já
  funciona bem no seu próprio contexto editorial.
- [x] **Espaçamento padronizado nos três shells de página**: `TypeViewScreen.tsx` e
  `DetailViewScreen.tsx` (`px-4 py-2` → `px-4 py-3`, mesmo padding nos dois agora);
  `DetailShell.tsx` (`space-y-5` no `<section>` externo → `space-y-6`, mantendo
  `space-y-4` no bloco interno — hierarquia de 6 entre blocos maiores da página, 4
  entre itens dentro de um bloco).

### Achado da rodada: `npm run build` não detecta todo erro de CSS que o `next dev` detecta

Um comentário CSS que escrevi continha a sequência `*/` no meio do texto
(`text-*/font-*`), fechando o bloco de comentário no meio da frase e deixando o resto
do texto como CSS inválido. **`npm run build` completou sem nenhum erro** (19 rotas,
build limpo) — só `next dev` (Turbopack, client bundle) acusou
`Error: Parsing CSS source code failed` e devolveu 500 em toda rota. Corrigido
reescrevendo o comentário sem a sequência `*/` solta. **Lição**: para qualquer
mudança em `globals.css`, `npm run build` sozinho não é suficiente como checkpoint —
confirma a necessidade, já prevista no plano deste bloco, de validar contra o
servidor de dev real, não só tipo/build.

### Checkpoint desta rodada (P9)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 3/3 arquivos, 13/13
testes. Validado contra servidores reais (mesmo processo de matar zumbis antes de
subir, ver P8): `GET /permissions` → `<h1>Permissions</h1>` com `.text-page-title`,
zero `<h2>` na página (confirma remoção do título duplicado); `GET /auth/login` →
`<h3>Login</h3>` com `.text-section-title`; `GET /users` → `<h1>Users</h1>` intacto.
Nenhum erro de aplicação em nenhuma das três páginas.

---

## P10 — Primitivas shadcn faltantes — ✅ feito em 2026-10-14

- [x] **`Textarea` e `Alert` instalados** via `npx shadcn add textarea alert`.
  **Achado repetido do P4**: o CLI gerou os dois arquivos importando `cn` do pacote
  npm `"cn"` em vez de `@lib/utils` (padrão do resto do design system) — corrigido
  nos dois, e a dependência `cn` (reintroduzida pelo CLI, sem nenhum outro uso no
  projeto) removida de novo do `package.json`. **Aplicação real only no
  `DetailShell.tsx`**: o banner de erro cravado
  (`border border-red-300 bg-red-50 text-red-700`) foi trocado por
  `Alert variant="destructive"` + `AlertDescription` + ícone `AlertCircle`
  (lucide). A aplicação de `Textarea` dentro do `FormView.tsx` fica para o P12 (onde
  o formulário é revisado como um todo, para não tocar o mesmo arquivo em duas
  rodadas fragmentadas).
  **Achado**: assim como `toolbar` no P8, a prop `error` do `DetailShell` também não
  tem nenhum consumidor real hoje (grep vazio) — a troca de markup foi feita mesmo
  assim (mesma lógica do `toolbar`: deixar pronto para uso, não é código morto a
  remover, é um slot que ainda não tem uma feature que o preencha).
- [x] **Variante `inline-detail` adicionada ao `select.tsx`** (o wrapper nativo do
  projeto, não o Select Radix do shadcn — confirmado no mapeamento do P7/planejamento
  deste bloco). Reescrito com `cva`, replicando exatamente o padrão de variantes já
  usado em `input.tsx` (`default` = aparência de campo normal; `inline-detail` =
  `rounded-none border-0 border-b` para ficar visualmente igual ao `Input` no modo de
  edição). Zero consumidor hoje (confirmado por grep) — pronto para o P12.
- [x] **Decisão de não instalar**: Combobox/Command (não há campo de busca com
  autocomplete em nenhum formulário hoje — o único candidato, escolher uma relação,
  já resolve isso via `RelationPicker` com `Dialog`+debounce), Accordion/Breadcrumb
  (sem hierarquia de navegação nem conteúdo colapsável em nenhuma tela real),
  Pagination (`ListView.tsx` já tem paginação funcional via TanStack Table —
  instalar o componente de paginação do shadcn, pensado para links `<a>`, exigiria
  reescrever uma lógica client-side que já funciona).

### Checkpoint desta rodada (P10)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 3/3 arquivos, 13/13
testes. Validado contra servidores reais: `GET /users/:id` carrega sem erro com o
`DetailShell` já usando `Alert` internamente (prop `error` não exercitada por nenhum
fluxo real hoje, mas a troca de componente não quebrou a renderização normal).

---

## P11 — Convenção de botões — ✅ feito em 2026-10-14

- [x] **Convenção documentada em `/develop`.** Nova seção "Convenções de UI"
  (`ConvencoesUiSection`, `part4-referencia.tsx`, registrada em `nav-config.ts` e
  `DevelopDocsShell.tsx`, grupo "Referência"): `save` = submit/autosave (dominante,
  mantido); `default` = ação primária fora de formulário (ex.: futuro botão "+ Novo"
  do P13); `outline` = secundária com peso visual (cancelar, fechar); `ghost` =
  terciária/ícone em contexto denso (linha de tabela, dropdown); `destructive` =
  irreversível; `link` = navegação leve dentro de lista/tabela.
- [x] **Inconsistência real encontrada e corrigida** — não nos dois arquivos que o
  planejamento original apontava (`RelationPicker.tsx`/`MetaDataSidebar.tsx`
  já seguiam a convenção ao ler o código de novo: `outline` para o trigger
  secundário do drawer, `ghost` para o ícone de fechar — nenhuma mudança neles).
  O caso real estava em **`RelationTablePanel.tsx`**: o botão "Salvar" (criar nota)
  usava a variante `default` implícita (sem `variant` declarado) em vez de `save`,
  e "Cancelar" usava `ghost` em vez de `outline`. Corrigido para alinhar com a
  convenção — nenhum outro par Salvar/Cancelar foi encontrado no resto do código
  (confirmado por grep em todo `src/`).

---

## P12 — Formulários — ✅ feito em 2026-10-14

O maior bloco do plano de UI. Reescrito `FormView.tsx` por completo.

- [x] **`FormFieldConfig.type` ganhou `checkbox`/`switch`** (`lib/registry/types.ts`).
  Nenhum módulo usa esses tipos hoje — é capacidade nova para quando um módulo
  precisar de um campo booleano, sem abusar de `select` com `"true"`/`"false"`.
- [x] **`FormView.tsx` renderiza componentes reais**: `Textarea` (P10) no lugar do
  `<textarea>` cru; `Select` (P10, com a variante `inline-detail` no modo edit) no
  lugar do `<select>` cru; `Checkbox`/`Switch` via um componente auxiliar novo,
  `BooleanFieldInput`. **Achado de implementação**: `Checkbox`/`Switch` (Radix) usam
  `checked`/`onCheckedChange`, não `value`/`onChange` como os demais campos, e não
  geram entrada no `FormData` nativo por conta própria — `BooleanFieldInput` resolve
  os dois problemas com um `<input type="hidden">` paralelo ao componente visual,
  sincronizado via estado interno (modo uncontrolled, create) ou via `checked`
  vindo de fora (modo controlled, edit) — funciona nos dois modos sem duplicar
  lógica.
- [x] **`Label` agora aparece também no modo edição** — antes só existia no create;
  confirmado no HTML real (`GET /users/:id` passou a mostrar "E-mail"/"Senha"/"Status"
  como labels, onde antes não havia nenhum).
- [x] **Mensagens de erro por campo via zod — módulo novo `lib/registry/form-validation.ts`,
  genérico desde já (não só prova de conceito num módulo).** `buildFormSchema`
  deriva um `z.object` a partir do próprio `FormFieldConfig[]` do módulo (sem
  escrever schema manual por módulo); `validateFormPayload` devolve
  `{ok:true} | {ok:false, fieldErrors}`. **Dois achados reais de implementação,
  cobertos pelos 5 testes novos (`form-validation.test.ts`)**:
  1. Encadear builders nativos do zod (`z.string().email(msg).min(1,msg2)`) faz um
     campo e-mail vazio+obrigatório reportar "e-mail inválido" em vez de
     "obrigatório" — a ordem dos checks internos do zod decide qual mensagem
     "ganha", não a ordem lógica que eu queria. Resolvido com um único
     `superRefine` por campo, com prioridade explícita (vazio+obrigatório sempre
     vence sobre formato errado).
  2. No zod 4, `.refine(check, (value) => ({message}))` com mensagem dinâmica
     **não aplica a mensagem** (cai no "Invalid input" genérico) — só
     `superRefine` + `ctx.addIssue({message})` respeita uma mensagem calculada a
     partir do valor. Confirmado isolando o comportamento num script Node antes de
     decidir a correção.
  **Integração**: `createRecordFormAction` (`lib/registry/actions.ts`) validava
  nada antes — agora valida o payload completo antes de chamar `dataHandlers.create`,
  devolvendo `fieldErrors` no `ActionState` em vez de só uma mensagem genérica.
  **Mudança de assinatura que quebrou os 5 módulos**: a função passou a receber
  `fields: FormFieldConfig[]` (para poder derivar o schema) em vez de só
  `fieldNames: string[]` — e por ela ser consumida via `.bind()` em cada
  `contract.tsx`, tentar deixá-la genérica (`<T extends object>`) quebrava a
  inferência de tipo do `.bind()` (TypeScript não propaga genéricos através de
  `Function.prototype.bind`, inferia `T = object` e `keyof object` vira `never`).
  Resolvido tipando o parâmetro como `FormFieldConfig<Record<string, unknown>>[]`
  (estrutural, sem genérico próprio na função) — os 5 `contract.tsx`
  (`users`/`roles`/`permissions`/`tenants`/`favorites`) atualizados para passar
  `formFields` direto em vez de `formFields.map((f) => f.name)`.
  No autosave do edit, a mesma validação roda dentro do `onSave` do
  `useAutoSaveController`, antes do PATCH: se inválido, marca os `fieldErrors`
  (estado local do `EditFormView`) e lança para o `onError` existente, sem chamar
  a API — evita um PATCH condenado a falhar/persistir dado inválido.
- [x] **Indicador de loading por campo.** `useAutoSaveController.saving` é um
  booleano do formulário inteiro (não por campo — o commit sempre salva o draft
  completo, não um campo isolado); como não existe granularidade por campo na
  API atual do hook, o indicador (`Loader2` animado) aparece ao lado do `Label` de
  **todo** campo enquanto qualquer commit estiver em andamento — mais simples que
  fingir uma granularidade que o hook não tem, e ainda comunica "algo está
  salvando" sem inventar estado novo.

### Checkpoint desta rodada (P11+P12)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 4/4 arquivos, 18/18
testes (13 anteriores + 5 novos de `form-validation.test.ts`). Lint dos arquivos
tocados sem novidade (2 warnings pré-existentes em `RelationTablePanel.tsx`, não
relacionados à troca de variante). **Validado contra servidores reais**: `GET
/users?view=form` → Labels "E-mail"/"Senha" certas; `GET /users/:id` → Labels
"E-mail"/"Senha"/"Status" (confirma P12.3, antes não existiam no edit), `Select`
renderizado (`data-slot="select"`, opção "Selecione..."); `GET /roles?view=form` →
Labels "Nome"/"Tipo"/"Descrição", `Select` e `Textarea` presentes. Nenhum erro de
aplicação em nenhuma página. **Não verificado nesta sessão** (sem ferramenta de
automação de navegador, mesma ressalva já registrada no P4): o clique real de
submissão no browser — criar com erro e ver a mensagem aparecer, criar com sucesso,
editar um campo e ver o autosave disparar. A cobertura real da lógica de validação
vem dos 5 testes unitários (determinísticos, não dependem de browser); a
renderização SSR das páginas foi confirmada via HTML real.

---

## P13 — Criar via `Sheet` + alinhar overlays existentes — ✅ feito em 2026-10-14

- [x] **`form` removido do `ViewSwitcher`** — deixou de ser um modo de visualização
  misturado com `list`/`cards`/`graph` (o ícone `Plus` que destoava dos ícones de
  "como exibir dados"). `ICON_BY_VIEW` perdeu a entrada; `ViewSwitcher` agora
  filtra `"form"` de `views` antes de montar o `ToggleGroup` (defesa redundante,
  já que `views` também parou de listar `"form"` nos 5 contracts — ver abaixo) e
  retorna `null` se não sobrar nenhuma view real.
- [x] **Novo botão "+ Novo" abre um `Sheet`** (`components/TypeView/CreateRecordSheet.tsx`,
  novo). Reaproveita 100% o `FormView mode="create"` que cada módulo já montava em
  `listLayout.form(ctx)` — não duplica lógica de criação nenhuma, só troca a casca
  (antes: substituía a lista inteira ao navegar para `?view=form`; agora: Sheet
  lateral por cima da lista).
  **Restrição real de RSC descoberta no caminho**: `TypeViewScreen` (Server
  Component) é quem chama `mod.listLayout.form(ctx)` — uma função não pode viajar
  como prop de um Client Component ancestral (`CreateRecordSheet`, que precisa de
  `useState` para `open`/`setOpen`) até dentro dessa chamada, porque ela passa por
  um Server Component no meio e funções não serializam através da fronteira RSC.
  Resolvido com Context API (`contexts/create-sheet-context.tsx`, novo): Context
  atravessa a fronteira RSC normalmente desde que o Provider seja Client Component
  — o Server Component no meio só repassa `children` sem precisar saber nada sobre
  isso. `CreateFormView` (dentro de `FormView.tsx`) consome o contexto e chama
  `onCreateSuccess?.()` quando `state.ok && state.message` (sinal de resposta real
  do servidor — `state.ok` já é `true` no estado inicial do `useActionState`, antes
  de qualquer submit, então não basta checar só `ok`).
  **`"form"` removido de `views: [...]`** nos 5 contracts (`users`/`roles`/
  `permissions`/`tenants`/`favorites`) — deixou de ser uma "view" roteável por
  `?view=form` (cai no fallback `defaultView`, sempre `"list"` nos 5), mas a função
  `listLayout.form` continua existindo e é chamada diretamente pelo
  `CreateRecordSheet` via `TypeViewScreen`, não mais através do roteamento de
  `mode`/`TypeView`.
- [x] **`RelationPicker.tsx` alinhado**: `Skeleton` (4 linhas) no lugar do
  `<p>Carregando...</p>` cru; largura do `DialogContent` simplificada de
  `w-[720px] max-w-full sm:max-w-[720px]` (redundante — a base já era fixa em
  720px, então o `max-w-full`/`sm:max-w` não acrescentavam nada) para
  `w-full sm:max-w-[720px]`, mesmo comportamento final mas consistente com o
  padrão do `DialogContent` default (`w-full max-w-[calc(100%-2rem)] sm:max-w-sm`).

### Checkpoint desta rodada (P13)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 4/4 arquivos, 18/18
testes. Lint sem regressão (confirmado via `git stash`: o único erro e os dois
warnings reportados nos arquivos tocados já existiam antes desta rodada — não são
meus). **Validado contra servidores reais**, de ponta a ponta:
`GET /users` → botão "Novo" presente, `data-slot="sheet-trigger"` presente,
`data-slot="sheet-content"` **ausente** (confirma que o Sheet começa fechado —
Radix só monta o conteúdo via Portal quando aberto), `aria-label="form"` ausente no
switcher, `<table>` real da lista presente; `GET /users?view=form` → sem erro,
nenhum campo de senha solto substituindo a lista, `<table>` presente (confirma o
fallback para `"list"`); `GET /favorites` → switcher mostra só
`list`/`cards`/`graph`, botão "Novo" presente; `GET /audit` (módulo read-only) →
**sem** botão "Novo" e **sem** `sheet-trigger`, confirmando que o botão só aparece
quando o módulo de fato declara `listLayout.form`. **Não verificado nesta sessão**
(sem ferramenta de automação de navegador): o clique real no botão abrindo o Sheet
e o fechamento automático após criar com sucesso — a lógica do Context foi inferida
corretamente pela estrutura do código e pelos sinais indiretos no HTML (Sheet
fechado por padrão), mas o ciclo completo open→submit→close não foi clicado de
verdade.

---

## P14 — `EmptyState` e `Skeleton` padronizados — ✅ feito em 2026-10-14

- [x] **Componente novo `components/ui/empty-state.tsx`** — ícone (default `Inbox`
  do lucide, trocável), título, descrição opcional, ação opcional. Funciona tanto
  solto numa página quanto dentro de uma célula de tabela (`<td colSpan>`), já que
  é só um `<div>` flexível.
- [x] **12 ocorrências de texto solto substituídas** — mais do que as ~10 do
  plano original, achadas por grep direto (`ListView`, `CardsView`,
  `RelationPicker`, `RelationCrudHost`, `RelationTablePanel`, `ContextPanel`,
  `AuditPanel`, `PermissionRolesHost`, `UserPermissionsHost`, `TenantUsersHost`,
  `TenantRolesHost`, `AuditListView` — os últimos 3 não estavam na lista do
  planejamento original).
  **Achado real de duplicação, corrigido**: `PermissionRolesHost.tsx` renderizava
  sua própria mensagem de vazio ("Nenhum role usa esta permissão ainda.") **além**
  da que `RelationCrudHost` (usado internamente via `createRelationHost`) já
  renderiza — as duas apareceriam juntas quando vazio. Resolvido adicionando
  `emptyMessage?: string` como prop configurável em `RelationCrudHost` e
  propagando via `createRelationHost`, em vez de duplicar a renderização.
  Aproveitada a mudança para dar mensagens específicas (não o genérico "Nenhum
  item.") nos 4 usos de `createRelationHost` (`UserRolesHost`, `RoleUsersHost`,
  `RolePermissionsHost`, `PermissionRolesHost`).
- [x] **`Skeleton` em `RelationCrudHost`** — a busca inicial via `list()` (prop
  opcional) não tinha nenhum estado de loading visual; adicionado `loading`
  state + 3 linhas de `Skeleton` enquanto carrega, antes de decidir entre
  `EmptyState` (vazio) ou a tabela real.
- [x] **Bug real encontrado durante a validação, corrigido (regressão do P12,
  não do P14 em si)**: o React acusava em runtime "Select elements must be
  either controlled or uncontrolled" toda vez que um módulo com campo `select`
  carregava — `renderFieldInput` (`FormView.tsx`) passava `value` **e**
  `defaultValue` simultaneamente para o `<Select>`, sempre, nos dois modos.
  Só apareceu nos logs do servidor de dev durante a validação visual deste
  bloco (nenhum teste automatizado pega warning de console do React).
  Corrigido: `value` quando `onChange` está presente (modo edit, controlled),
  `defaultValue` quando não (modo create, uncontrolled) — nunca os dois.

### Achado da rodada, não é bug: `GET /tenants` retorna 500 para usuário recém-registrado

Validando este bloco, `GET /tenants` devolveu 500 para um usuário de teste
recém-criado via `POST /api/auth/register`. Não é regressão: o log mostra
`403 Acesso negado: permission insuficiente` vindo do backend (RBAC funcionando
corretamente — esse usuário não tem `tenant.read`). O frontend hoje não tem um
error boundary amigável para esse caso (propaga como 500 genérico em vez de uma
página "sem permissão") — é um gap de UX genuíno, mas fora do escopo deste bloco
(P14 é sobre estado vazio, não sobre erro de autorização); fica como candidato a
item futuro, não corrigido aqui.

### Checkpoint desta rodada (P14)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 4/4 arquivos,
18/18 testes. Lint confirmado sem regressão via `git stash` — os 28 problemas
(17 erros, 11 warnings) nos arquivos tocados são **exatamente os mesmos antes e
depois** desta rodada (débito de `static-components` em
`UserRolesHost`/`RoleUsersHost`/`RolePermissionsHost`, já documentado desde o
P6, não corrigido aqui). **Validado contra servidores reais**: `GET
/favorites?view=cards` (tenant novo, zero favoritos) → `EmptyState` renderizado
de verdade no HTML ("Nenhum item encontrado." + ícone `Inbox` do lucide); `GET
/users/:id` → sem o warning de Select controlado/não-controlado no log do
servidor (confirmado ausente após o fix, presente antes dele). **Não
verificado**: o `EmptyState` dentro de abas não-ativas do `Tabs` (ex.: aba
"Permissions" de um usuário sem permissões) — Radix Tabs só monta no DOM a aba
ativa (`data-state="active"`), então não aparece no HTML de uma requisição SSR
simples sem clicar na aba; a lógica foi revisada no código e é idêntica à das
abas que puderam ser validadas (mesma função `EmptyState`, mesma estrutura).

---

## P15 — Branding mínimo no `SidebarHeader` — ✅ feito em 2026-10-14

- [x] **Placeholder de nome/logo do produto.** `AppSidebar.tsx`: `SidebarHeader`
  estava completamente vazio — adicionado um quadrado com ícone `Blocks` (lucide)
  sobre fundo `bg-primary` + o nome "Alicerce" (`.text-page-title`, token do P9).
  **Decisão de implementação**: não usa `SidebarMenuButton` (como o resto do
  menu) porque não há nenhuma ação associada a clicar no branding — usar um
  botão `disabled` deixaria o texto com `opacity-50` (classe nativa do
  componente), apagando visualmente o nome do produto, que é o contrário do
  efeito desejado. Um `<div>` simples resolve sem herdar esse estado.
  Comentário no código aponta explicitamente onde substituir pelo `<img>` de
  uma logo real — é um template sem marca própria, então o placeholder precisa
  ser fácil de achar e trocar.

### Checkpoint desta rodada (P15)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 4/4 arquivos,
18/18 testes. Lint do arquivo tocado sem nenhum problema. Validado contra
servidores reais: `GET /dashboard` → "Alicerce" e o ícone `Blocks` presentes no
HTML, sem erro de aplicação.

---

### Fechamento do bloco de padronização visual (P8 → P15)

Com o P15, o bloco inteiro pedido pelo usuário ("o UX/UI hoje está muito
simples, precisa padronizar... formulários, drawers, tipografia... bom visual
comercial") está fechado. Resumo do que mudou, de ponta a ponta:

- **4 bugs reais corrigidos** (P8): título vazio em toda tela de detalhe, props
  mortas no `DetailShell`, tabs reimplementadas à mão, cor cravada quebrando
  dark mode.
- **Fundação de tokens** (P9): hierarquia de texto nomeada, espaçamento
  consistente, mais um título duplicado encontrado e removido
  (`PermissionsListView`).
- **3 primitivas shadcn novas** (P10): `Textarea`, `Alert`, variante
  `inline-detail` no `Select` — decisão explícita de **não** instalar
  Combobox/Accordion/Breadcrumb/Pagination sem consumidor real.
- **Convenção de botões documentada e uma inconsistência real corrigida** (P11).
- **Formulários reescritos** (P12): campos reais em vez de HTML cru, `Label`
  sempre visível, erro por campo via zod genérico (não RHF — decisão
  justificada), indicador de loading por campo.
- **Criar passou a ser um `Sheet`** (P13), não mais um modo de visualização
  disfarçado — com uma restrição real de RSC descoberta e resolvida via Context.
- **`EmptyState`/`Skeleton` padronizados** (P14) em 12+ pontos, mais uma
  duplicação de mensagem de vazio encontrada e corrigida, mais um bug real de
  runtime (`Select` controlado/não-controlado) pego durante a validação.
- **Branding mínimo** (P15) no lugar que estava vazio desde o início.

**Padrão que se repetiu em quase todo bloco**: a validação visual contra
servidor real (não só `tsc`/`build`/testes) encontrou algo que os checkpoints
automatizados não pegam — um comentário CSS que quebrava o parser (P9), um
warning de runtime do React (P14), duplicações de UI que só aparecem quando se
olha a tela renderizada (P9, P14). Vale manter esse hábito nos próximos blocos
do `PLAN.md`, não só nos de UI.

---

## P16 — Atualização visual: cor de marca, elevação, confirmações — ✅ feito em 2026-10-14

Pedido explícito do usuário, depois do P8–P15: até aquele ponto a padronização
tinha mantido o visual neutro já existente, só organizando inconsistências. O
usuário pediu uma atualização real rumo a um "padrão de UX/UI de mercado",
citando `Dialog`/`Alert` como exemplos de elementos a adicionar. Antes de
tocar em código, três perguntas focadas (`AskUserQuestion`) calibraram a
direção — decisão de design de grande raio, afeta a aparência do app inteiro:
**SaaS moderno com cor de marca** (base neutra + azul vibrante em destaques,
sombra leve nos cards — não minimalista puro, não dashboard denso, não
"new-york" de alto contraste), **azul** como tom, **densidade equilibrada**
(nem compacta nem espaçosa).

- [x] **Nova paleta de marca azul, com contraste WCAG calculado, não chutado.**
  Escrito `scripts/check-contrast.mjs` (conversão OKLCH → sRGB linear →
  luminância relativa → razão de contraste, fórmula WCAG 2.x) para validar os
  candidatos antes de aplicar — nenhum valor foi escolhido só visualmente.
  Light: `--primary: oklch(0.5 0.2 260)` (`#0559d2`) vs `--primary-foreground`
  branco → ratio 5.97:1 (mínimo AA para texto normal é 4.5:1); `--ring: oklch(0.6
  0.18 260)` vs fundo branco → ratio 4.03:1 (mínimo para componentes de UI é
  3:1). Dark: `--primary: oklch(0.72 0.16 258)` (`#66a5ff`) com
  `--primary-foreground` **escuro**, não branco — testado e confirmado que azul
  claro + texto branco só dá ratio 2.43:1 (reprova), enquanto azul claro + texto
  escuro dá 7.81:1. `--sidebar-primary`/`--sidebar-ring` uniformizados com o
  novo primary em cada modo (antes o dark já tinha um azul ali, inconsistente
  com o light que era cinza — achado de uma inconsistência pré-existente).
  `--save` (cor do botão de submit/autosave) mantido como estava — já era um
  azul da mesma família de hue (259, contra o novo 260), com ratio 8.35:1,
  não precisava mudar. O botão `default` (`bg-primary`) já ficou azul
  automaticamente, sem tocar em `button.tsx` — ele já consumia o token.
- [x] **Elevação (sombra) padronizada em superfícies flutuantes.** `Sheet`/
  `Popover`/`DropdownMenu` já tinham `shadow-md`/`shadow-lg`; `Dialog` e `Card`
  não tinham nenhuma — adicionado `shadow-lg` ao `DialogContent` e `shadow-sm`
  ao `Card`.
- [x] **`CardsView.tsx` modernizado** — usava `<a>` com `border`+`hover:shadow-sm`
  cru; trocado por `Card`/`CardContent` reais (ganha a sombra base do Card +
  hover mais evidente, `hover:shadow-md`).
- [x] **`AlertDialog` instalado e os 3 `window.confirm` nativos substituídos**
  (`UserRolesHost`, `RoleUsersHost`, `RolePermissionsHost` — remoção de
  role/usuário/permissão). **Mesmo bug recorrente do CLI** (P4/P10): o arquivo
  gerado importava `cn` do pacote npm em vez de `@lib/utils`, e `Button` via
  `@/components/ui/button` em vez do alias `@components` — corrigido; `cn`
  removido de novo do `package.json`.
  Criado `components/ui/confirm-dialog.tsx` (wrapper declarativo do
  `AlertDialog`) e `hooks/use-confirm-dialog.tsx` (hook imperativo —
  `const {confirm, dialog} = useConfirmDialog(); const ok = await confirm({title,
  description}); if (!ok) return;` — mesma ergonomia que `window.confirm` já
  tinha, só que assíncrono e com um Dialog real em vez do confirm nativo do
  browser).
  **Achado de duplicação durante a implementação**: a primeira versão
  confirmava tanto dentro de `RelationCrudHost` (camada genérica usada via
  `createRelationHost`) quanto dentro do `onDetach` de cada Host — o usuário
  veria dois diálogos em sequência. Resolvido centralizando a confirmação só
  no `RelationCrudHost` (via novas props `confirmDetachTitle`/
  `confirmDetachDescription`, propagadas por `createRelationHost`), e revertida
  a confirmação duplicada dos 3 Hosts — cada um agora só passa a mensagem
  customizada, não a lógica de confirmar.
  **Mais duas ações destrutivas que não tinham confirmação nenhuma, corrigidas**
  (não pedidas explicitamente, achadas ao mapear o padrão): o ícone de lixeira
  genérico do `RelationCrudHost` (usado por `PermissionRolesHost` e por
  qualquer módulo futuro via `createRelationHost`) e a remoção de nota em
  `RelationTablePanel.tsx` — ambos agora confirmam antes de excluir.

### Checkpoint desta rodada (P16)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 4/4 arquivos,
18/18 testes. Lint comparado via `git stash`: **zero erros novos** nos arquivos
tocados, +1 warning (`exhaustive-deps`, mesma classe de débito já aceita em
todo o projeto desde o P0). **Validado contra servidores reais**: extraído e
lido o CSS compilado de verdade (não só o código-fonte) — `--primary: #0559d2`
no light e `--primary: #66a5ff` no dark, exatamente os hex calculados pelo
script de contraste; `.shadow-sm` presente e definida; botão "+ Novo" com
`data-variant="default"` (consome `bg-primary`, agora azul); tela de detalhe de
usuário com role atribuída mostrando o ícone de remover (trigger do
`AlertDialog`) sem o próprio dialog montado no DOM enquanto fechado (confirma
que o Radix só monta via Portal quando aberto — mesmo padrão já visto no P13).
**Não verificado nesta sessão**: o clique real abrindo o `AlertDialog` e
confirmando/cancelando — mesma limitação de ferramenta de automação de
navegador já registrada em blocos anteriores.

---

## Roteiro de fechamento do backlog (2026-10-14)

Índice de execução das pendências que restaram depois do P16 — não duplica o
detalhe de cada item (que já está no bloco de origem, linkado entre
parênteses), só organiza a **ordem**. Etapas pequenas, uma de cada vez, com
checkpoint antes de seguir para a próxima — mesmo método do resto deste
arquivo.

### Etapa 1 — Gaps pontuais já encontrados, zero dependência nova — ✅ feito em 2026-10-14

- [x] **Error boundary amigável para 403 de permissão.** `TypeViewScreen.tsx` e
  `DetailViewScreen.tsx` agora envolvem a chamada de dados (`dataProvider.search`/
  `.read`) num try/catch: se o erro for `ApiServerError` com `status === 403`,
  renderiza `PermissionDeniedView` (novo, `components/Layout/PermissionDeniedView.tsx`
  — reaproveita o `EmptyState` do P14 com ícone `ShieldAlert`) em vez de deixar
  a exceção propagar até o 500 genérico do Next. Mesmo padrão que já existia em
  `dashboard/page.tsx` (confirmado por grep antes de implementar — não inventei
  um padrão novo, segui o que já tinha precedente no próprio código).
  **Achado ao validar**: não consegui reproduzir o 500 original do P14 contra
  servidor real — o `AppAccessGuard` (client-side) já busca o perfil atualizado
  do usuário a cada render e intercepta antes de qualquer chamada de dados,
  mesmo forçando um cenário de JWT antigo + permissão revogada no backend no
  meio da sessão. O código novo é uma defesa em profundidade genuína (nunca
  exercitada no caminho feliz atual, mas protege contra qualquer inconsistência
  futura entre as duas camadas) — validado por `tsc`/build/testes limpos e por
  inspeção da lógica, não por reproduzir o 500 de fato.
- [x] **Corrigido `static-components` em `UserRolesHost`/`RoleUsersHost`/
  `RolePermissionsHost`/`PermissionRolesHost`** (achado o 4º consumidor com o
  mesmo problema, não listado originalmente). Causa raiz: `createRelationHost(config)`
  retornava um **componente novo** a cada chamada, normalmente dentro de um
  `useMemo` no componente chamador — quando as dependências desse `useMemo`
  mudavam (`currentTenantId` após um re-render do `AuthProvider`, por exemplo),
  a identidade do componente mudava também, e o React desmontava a instância
  antiga e montava outra, **resetando `items`/`pickerOpen` sem motivo**. Não
  era só lint — era um bug real de estado. Resolvido reescrevendo
  `lib/registry/relation-host.tsx`: `RelationHost` passou a ser um componente
  único e fixo (exportado direto, não mais uma fábrica `createRelationHost`),
  recebendo a config variável só como prop (`<RelationHost config={config}
  initial={...} />`); os 4 consumidores passaram a memoizar a **config** (um
  objeto de dados) em vez de memoizar o **componente**.
  **Segundo achado no caminho, consequência direta do primeiro fix**: ao
  reescrever, apareceu um erro novo de lint (`set-state-in-effect`) que estava
  mascarado antes pela estrutura de fábrica — o `useEffect` que sincronizava
  `items` a partir de `initial`/`config.initialData` chamava `setState`
  diretamente dentro do efeito, anti-pattern real do React (cascading
  renders). Corrigido com o padrão oficial "ajustar estado a partir de uma
  prop" (comparar o valor anterior **durante o render**, via um segundo
  `useState` guardando o valor anterior, chamando `setState` fora de qualquer
  efeito) — não dá para simplesmente "derivar" `items` de `initial` porque
  `items` diverge dele conforme o usuário anexa/remove itens.

### Checkpoint desta rodada (Etapa 1)

`tsc --noEmit` limpo, `npm run build` limpo, `npx vitest run` → 4/4 arquivos,
18/18 testes. Lint comparado via `git stash`: o erro `static-components` e o
warning de `exhaustive-deps` que o acompanhava **desapareceram** nos 4
arquivos — não geraram nenhum erro novo, só restam os `no-explicit-any`
pré-existentes (débito da Etapa 3, não tocado aqui de propósito). Validado
contra servidores reais: `GET /tenants` com usuário sem `tenant.read` → 200
(antes 500), interceptado pelo `AppAccessGuard` com a mensagem "Acesso negado.
Permissão obrigatória: tenant.read."; `GET /users/:id` com role ADMIN
atribuída → tabela de roles e botão "Associar" renderizando normalmente após
a refatoração do `RelationHost` (confirma que attach/detach continuam
funcionando, não só que o lint ficou limpo).

### Etapa 2 — Trilha A: hardening do backend (P7.2 → P7.5)

Ordem já acordada — cada item é sua própria rodada de discussão + implementação
antes do próximo (ver detalhe completo no bloco **P7** acima):

1. **P7.2** — Auditoria de falhas de autenticação/autorização (401/403).
2. **P7.3** — Observabilidade estruturada (correlation-id + logger).
3. **P7.4** — RLS (Row-Level Security) no Postgres.
4. **P7.5** — Cache Redis de permissões.

### Etapa 3 — Débito de lint (mecânico, sem risco de segurança)

- [ ] Zerar os 289 erros de lint do backend (`npm run lint` dentro de
  `backend/`) — maior parte concentrada em `test/roles.attach-detach.e2e-spec.ts`
  e `roles.service.spec.ts` (mocks de Prisma com `any`), ver P0.
- [ ] Zerar os 55 erros de lint do frontend restantes desde o P6 (17
  `no-explicit-any`, 16 `no-unused-vars`, 5 `exhaustive-deps`, etc. — lista
  completa no bloco P6).
- [ ] Só depois dos dois itens acima: tirar `continue-on-error: true` dos
  passos de lint em `.github/workflows/ci.yml`, tornando o gate bloqueante —
  é o que já estava planejado desde que o débito foi descoberto no P6.

### Etapa 4 — Upgrades maiores de framework (cada um isolado, branch própria)

Só depois da Etapa 2/3 — são os que têm maior risco de regressão, então quanto
mais estável o resto, melhor (ver detalhe completo no bloco **P0.3**):

1. NestJS v11 → v12 (ler breaking changes; testar Fastify/Swagger/e2e).
2. TypeScript 5.9 → 7.0 (reescrita nativa do compilador, não é bump trivial).
3. Prisma 7 → 8 — **checar antes se já saiu do RC** (estava `8.0.0-rc.22` em
   2026-10-13; não adotar RC num template).
4. Bumps menores sem pressa (`@tanstack/react-table` 8→9 é major, `radix-ui`,
   `recharts`, `react-intl`, `shadcn` CLI).

### Etapa 5 — Decisões já tomadas, aguardando outra fase (não é "fazer agora")

Não entram nesta sequência — ficam documentadas para não serem reabertas sem
necessidade:

- Módulo `task` no backend sem destino — aguarda a Fase 2 do `AGENTS.md`
  (limpeza de entidades específicas de ONG do schema).
- Refresh de sessão proativo (ler `exp` do JWT antes de expirar) — decisão
  explícita de manter reativo até o projeto tratar performance/edge runtime
  como tema próprio.
- `braces`/`fast-glob` no frontend — sem correção segura disponível; só
  reavaliar quando `shadcn`/`eslint-config-next` atualizarem a cadeia.

### Etapa 6 — Validação manual com ferramentas indisponíveis nesta sessão

Fazer quando a ferramenta estiver disponível, não bloqueia nenhuma etapa acima:

- [ ] `docker compose up --build` real (Docker não instalado neste ambiente —
  P6 só validou por equivalência).
- [ ] Clique real em navegador: `Dialog`/`AlertDialog`/toasts/`Sheet` de
  criação (abrir → submeter → fechar) — P4/P13/P14/P16 só validaram via
  HTML/CSS reais e testes unitários, nunca um clique de verdade.

---

## Decisões já tomadas pelo usuário (registradas para não perguntar de novo)

- **Captura do "before" na auditoria**: dispatch dinâmico no interceptor (não Prisma
  Client Extension) — implementado no P2, ver detalhes lá.
- **Refresh proativo de sessão** (ler `exp` do JWT antes de expirar, em vez de só
  reagir a 401): manter o modelo reativo atual por ora. Não existe `middleware.ts`
  neste projeto — criar um só para isso passaria a rodar em toda requisição da
  aplicação, não só nas de API, então essa decisão fica para quando o projeto tratar
  performance/edge runtime como tema próprio, não de passagem dentro do P2.
- **UI de troca de tenant (P4)**: era um mal-entendido de uma versão anterior do
  domínio — removida do backlog sem implementar nada, ver P4 para o detalhe completo.
- **P7, por onde começar**: `TenantScopeGuard` global primeiro (menor escopo, sem
  dependência nova) — RLS, Redis, logging estruturado e auditoria de 401/403 ficam
  para rodadas futuras, cada um com sua própria discussão antes de implementar.
- **Ordem combinada P7 restante + padronização visual (2026-10-14)**: duas trilhas
  independentes (sem dependência técnica entre si). **Trilha A (backend)**, dentro do
  P7: auditoria 401/403 → observabilidade estruturada (correlation-id + logger) → RLS
  → cache Redis; depois débito de lint; depois upgrades maiores de framework
  (NestJS v12, TS 7.0, Prisma 8 quando saísse do RC), cada um isolado em branch
  própria. **Trilha B (frontend, novo bloco P8→P15)**: P8 bugs (feito, ver acima) →
  P9 tokens de tipografia/espaçamento → P10 primitivas shadcn faltantes (decisão por
  item: instalar `Textarea`/`Alert`, ajustar `select.tsx` com variante inline-detail,
  não instalar Combobox/Accordion/Breadcrumb/Pagination sem consumidor real) → P11
  convenção de botões → P12 formulários (maior bloco: `checkbox`/`switch` no
  `FormFieldConfig`, `Textarea`/`Select` reais, `Label` também no edit, erro por
  campo via **zod leve — não react-hook-form**, decisão justificada: o projeto já
  tem dois modelos de estado de formulário idiomáticos — `useActionState` no create,
  `useAutoSaveController` por campo no edit — RHF duplicaria o primeiro e é
  incompatível com o segundo) → P13 criar via `Sheet` (decisão: **editar continua em
  página cheia, só criar migra** — `DetailView` já é main+side+abas de relação,
  não cabe num drawer; criar é bem mais simples e cabe no `Sheet` já instalado e
  ocioso) → P14 `EmptyState`/`Skeleton` novos (podem andar em paralelo a P11–P13) →
  P15 branding mínimo no `SidebarHeader` (flexível, pode ser feito em qualquer ponto).
  Recomendação: priorizar a Trilha B primeiro (demanda explícita mais recente do
  usuário), Trilha A em paralelo ou imediatamente depois.

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
