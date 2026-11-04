# Guia — criar um módulo novo

Usa o módulo `feedback` como exemplo real do que o gerador faz sozinho e do
que exige edição manual.

## 1. Rodar o gerador

```bash
npm run new:module feedback
```

Nome sempre singular, kebab-case.

## 2. O que o gerador já resolve sozinho

- **Backend**: model Prisma mínimo (`id`, `tenantId`, `title`, timestamps) em
  `backend/prisma/models/features/<nome>.prisma`; CRUD completo + `search`
  (service, controller, module, DTOs) em `backend/src/modules/<plural>/`,
  já usando `findOneOrThrow`, `resolvePagination` e
  `tenant-search.util.ts`; registro em `app.module.ts`; as 4 permissões
  básicas (`<nome>.create/read/update/delete`) em
  `permission-catalog.ts`; o model na lista `TENANT_SCOPED_MODELS`
  (`tenant-rls.extension.ts`); relação em `tenant.prisma`; migration de
  criação + migration de RLS (se o Postgres de dev estiver acessível).
- **Frontend**: types, provider REST
  (`createRestDataHandlers`), colunas, `ListView`, `contract.tsx`
  (`defineRecordModule` + `registerModule`, já no formato `header`/`sections`
  do detail — ver `docs/ui/detail-page.md`), páginas `app/(app)/<plural>/`,
  `app/(app)/<plural>/[id]/` e `app/(app)/<plural>/new/`; registro em
  `bootstrap.ts` e `alicerce.config.ts` (menu lateral, ícone, permissões).
  O campo `title` já vem com `primary: true` e o módulo com
  `createMode: "detail"` — "Novo" abre `/<plural>/new` (Detail em rascunho)
  em vez do Sheet; ver §4.
- Um `<plural>.service.spec.ts` básico (create + search filtrando por
  tenant).

## 3. O que exigiu edição manual (caso Feedback)

- **Campos reais do domínio**: o gerador só cria `title`. Foi preciso editar
  `feedback.prisma` à mão para adicionar `description`, o enum
  `FeedbackStatus` (`RECEIVED/IN_REVIEW/PLANNED/DONE/DECLINED`, default
  `RECEIVED`) e `createdById` (relação com `User`), e rodar
  `npx prisma generate` de novo.
- **`SEARCHABLE_FIELDS`/`FILTERABLE_FIELDS`/`SORTABLE_FIELDS`** em
  `feedbacks.service.ts` e **`formFields`/`columns.ts`** no frontend:
  ajustados para os campos reais (o gerador deixa só `title`).
- **Feature filha (`FeedbackComment`)**: não existe no gerador (que cobre só
  módulo independente, sem `--feature-of`). Foi criada à mão em
  `backend/src/modules/feedbacks/features/comments/` (rota nested
  `feedbacks/:feedbackId/comments`, `onDelete: Cascade` no schema) — é o
  exemplo canônico de Feature filha pra copiar ao criar uma nova. No
  frontend, exibida via `RelationTablePanel`.
- **Permissão especial (`feedback.manage`)**: adicionada manualmente ao
  `permission-catalog.ts` (o gerador só cria as 4 básicas). Uma rota própria
  (`PATCH /feedbacks/:id/status`) e um método de service próprios
  (`updateStatus`) garantem que só quem tem essa permissão muda o status —
  nunca pelo `update` genérico, e sempre checado no backend (o frontend só
  esconde o controle de quem não tem a permissão,
  `FeedbackStatusControl.tsx`, usando `useAuth().hasPermission(...)`).
- **Seed**: nada a fazer — `TENANT_ADMIN_PERMISSION_NAMES` é derivado
  automaticamente de `permission-catalog.ts`, então a nova permissão já cai
  no papel ADMIN sem editar `seed.ts`.
- **Testes**: o `*.service.spec.ts` gerado foi ampliado com casos de
  `updateStatus`; um e2e novo (`feedback-tenant-isolation.e2e-spec.ts`)
  cobre isolamento entre tenants e o bloqueio de `feedback.manage`, seguindo
  o mesmo padrão de `roles.attach-detach.e2e-spec.ts` (RolesPermissionsGuard
  substituído por um stub que povoa `request.user`).
- **Campo opcional no rascunho**: `description` precisou de `@IsOptional()`
  no DTO de create e `@default("")` no Prisma (+ migration) — o registro é
  criado assim que `title` (o campo `primary`) perde o foco, antes de
  `description` ser preenchida. Qualquer campo `required: true` que não seja
  o `primary` bloqueia a criação até ser preenchido; se isso não fizer
  sentido pro seu módulo (ex.: senha obrigatória), use `createMode: "sheet"`
  em vez de tornar o campo opcional só pra destravar o rascunho.

## 4. Conceitos do contrato (ADR 0005)

- **`FormFieldConfig` com `type: "image"`** (ADR 0010): o campo guarda o
  `fileId` (FK), não a URL — declare `previewField: "<campo>"` apontando
  pro campo do registro que já traz a URL de preview resolvida pelo
  backend (ex.: `avatarUrl`, `logoUrl`). **Nunca** uma função
  (`previewUrl: (record) => ...`) — função não serializa na fronteira
  Server→Client e derruba a página em produção sem avisar em dev/build
  (etapa 12.3, corrige C2). `core/registry/serializable-contracts.
  test.ts` falha se qualquer `formFields` de qualquer módulo tiver um
  valor função, não só `previewUrl`.
- **`FormFieldConfig.primary`**: um por módulo, o campo que dispara a
  criação em `/<plural>/new` quando perde o foco com algo digitado. O
  gerador já marca o primeiro campo (`title`).
- **`RecordModuleDefinition.createMode`**: `"detail"` (gerado por padrão) ou
  `"sheet"` (comportamento antigo — "Novo" abre um `Sheet` com
  `FormView mode="create"`). Troque pra `"sheet"` quando o módulo tiver um
  campo obrigatório que não tolera ficar vazio até o `primary` ser
  preenchido (ex.: `users`, que exige senha — `createOnly`, mínimo 6
  caracteres — por isso continua em `"sheet"`).
- **`DetailLayout.toolbar`**: `(ctx) => React.ReactNode` — ações extras da
  tela de detalhe, renderizadas no `AppTopbar` antes do botão de Metadados
  (ex.: um botão "Exportar" só daquele módulo). Opcional; sem isso o topbar
  mostra só o botão de Metadados.
- **`rowLink` em relações**: `RelationCrudHost`/`RelationHost` (ex.:
  `roles → users`) e `RelationTablePanel` aceitam `rowLink?: (item) => string
  | undefined` — quando o item da relação é um registro com Detail próprio,
  a primeira coluna vira link pra `/<módulo>/<id>`. Só passe uma função
  assim de um componente **client** (ex.: um `*Host.tsx` com `"use client"`,
  como `RoleUsersHost.tsx`) — nunca direto de `contract.tsx` (Server
  Component): função não atravessa a fronteira server→client. Se a relação
  vive inteira em `contract.tsx` (sem host próprio, como o showcase), use um
  campo de dado já resolvido (string) em vez de uma função — ver
  `modules/develop/showcase/ShowcaseRelationTable.tsx` (`linkKey`).

- **`DetailConfig.metadata`** (U6, ADR 0014): liga o drawer de Notas/Tags/
  Anexos/Histórico — `metadata: { notes: true, tags: true, attachments:
  true, history: true }` (cada chave é opcional, liga só o que o módulo
  quer). Sem permissão nova no catálogo: quem tem `<model>.read`/
  `<model>.update` já lê/altera os metadados do registro — ver
  `backend/src/core/authorization/record-permission.util.ts`. **O
  `remove()` do service precisa limpar os três** (sem FK entre metadado e
  registro, não há cascade automático do banco):

  ```ts
  await Promise.all([
      this.notesService.removeForRecord(entity, id, tenantId),
      this.recordTagsService.removeForRecord(entity, id, tenantId),
      this.filesService.removeAllForOwner(entity, id, tenantId),
  ]);
  ```

  (`entity` = nome singular do módulo, o mesmo valor do `resource` no
  catálogo de permissões — ex. `"feedback"`). Ver
  `backend/src/modules/feedbacks/feedbacks.service.ts` (`remove()`) e
  `backend/src/modules/feedbacks/feedbacks.module.ts` (importa
  `NotesModule`/`TagsModule`/`FileModule`) como referência completa.

## 5. Extensão 1:1 (`--extends`, U7/ADR 0014)

Quando um módulo pai já existe (ex.: `tenant`) e você precisa de um
complemento 1:1 — campos extras que vivem junto, mas não pertencem ao
mínimo genérico do pai (ver taxonomia do `AGENTS.md` §4.3, "Extensão de
Módulo") — use `--extends` em vez de criar um Módulo independente:

```bash
npm run new:module <nome-singular-kebab-case> -- --extends=<pasta-do-pai-em-backend/src/modules>
```

Ex.: `npm run new:module perfil-institucional -- --extends=tenant`.

**O que muda em relação a um módulo normal:**

- **`id` é a mesma chave do pai** (não tem `@default(uuid())` próprio):
  `model PerfilInstitucional { id String @id @db.Uuid; tenant Tenant
  @relation(fields: [id], references: [id], onDelete: Cascade) }`. Nunca
  existe mais de uma linha por registro pai, e ela some sozinha quando o
  pai é removido.
- **Sem lista, sem create, sem delete**: só `GET /<plural>/:id` e `PATCH
  /<plural>/:id`. A linha nasce (`upsert`) na primeira leitura ou escrita —
  nunca por `POST`.
- **Sem permissão nova no catálogo**: reaproveita as permissões
  `<pai>.read`/`<pai>.update` que o controller do pai já declara (mesmo
  raciocínio do U6 pra notas/tags — quem lê/altera o pai lê/altera a
  extensão).
- **O service da Extensão injeta o service do pai** e chama
  `parentService.findOne(parentId, tenantId)` antes de qualquer upsert —
  garante que o pai existe e pertence ao tenant (sem isso, um id de outro
  tenant passaria pela RLS da própria extensão por engano).
- **Precisa estar registrada no `core/registry` mesmo sem rota própria**: o
  gerador cria um `config/contract.tsx` com `defineRecordModule({ views: []
  , ... })` + `registerModule(...)` e o import em `bootstrap.ts` — sem
  isso, o autosave do `FormView` (`useAutoSaveController`) quebra com
  "Módulo não registrado", porque ele resolve o `update` via
  `getModule(model)`, não recebe a função direto. Mesmo motivo de
  `modules/perfil` e `modules/instituicao` chamarem `registerModule` com
  `views: []`.
- **A seção extra no detail do pai é uma edição mecânica** no
  `config/contract.tsx` do pai (mesmo estilo de `editExisting` usado em
  `tenant.prisma`/`app.module.ts`): o gerador insere um import e um item
  novo no array `sections`, cujo `render` busca a própria extensão
  (`read<Entidade>(record.id)`) e devolve um `FormSection` com o mesmo
  padrão de `InstitutionFormSection.tsx` (gate único por
  `<pai>.update`, não por campo). **Zero arquivo de `core/` tocado** —
  `DetailSection.render` e `FormView mode="edit"` com `model`/`recordId`
  arbitrários já existiam, não precisou mexer no motor.
- O nome do módulo frontend do pai normalmente é o mesmo nome da pasta em
  `backend/src/modules/`, com uma exceção conhecida: `tenant` (backend) ↔
  `instituicao` (frontend, não existe um módulo frontend "tenant") — ver
  `FRONTEND_PARENT_OVERRIDES` no topo de `scripts/new-module.mjs`. Um novo
  par de nomes divergentes entra nesse mapa.

**Exemplos de uso (TerceiroGestor, fora do Alicerce):**

- **Perfil institucional** (`perfil-institucional`, `--extends=tenant`):
  registros CMAS/CEBAS, CNAE, missão, diretoria, dados da página pública —
  tudo que é específico de ONG e não entra no `Tenant` mínimo do Alicerce
  (ADR 0014, decisão 1). Aparece como seção extra em
  `/configuracoes/instituicao` sem tocar no módulo `tenant` do Alicerce.
- **Pessoa ↔ User**: parecido na intenção (ligar um registro de domínio a
  algo da base), mas **não é** um caso de `--extends` — a relação é
  opcional e no sentido contrário: `Pessoa.userId` é uma FK **opcional**
  pra `User` (uma Pessoa pode existir sem login, ex.: atendido), não o
  outro jeito. `--extends` serve pra "todo pai tem uma extensão, com a
  MESMA chave"; Pessoa é um Módulo normal com uma FK nullable pro User.

## 6. Depois de gerar

```bash
cd backend  && npx tsc --noEmit && npm run lint && npm test
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

Se os campos do model mudaram depois que o gerador já rodou, rode
`npx prisma generate` (e, com Postgres acessível, `npx prisma migrate dev`)
de novo antes do checkpoint.

## 7. Dados pessoais e exclusão (LGPD)

Se o módulo guarda dado pessoal de alguém que não é um usuário do sistema
(ex.: pessoa atendida, contato, paciente), "excluir" nunca deve ser um
`DELETE` físico da linha: isso quebraria vínculos (relações, auditoria) e
perderia o histórico que outras partes do sistema dependem.

Siga o padrão de `UserRepository.anonymizeById` (etapa 9.3, Plano Base.md):
um método `anonymize<Entidade>ById(id)` no repositório que sobrescreve só
os campos de identificação (nome, e-mail, documento, telefone — o que for
dado pessoal) com um valor anônimo determinístico, mantém `deletedAt`/
`status` marcando o registro como inativo, e preserva tudo o resto
(relações, `createdAt`, auditoria). O service chama esse método em vez do
soft-delete genérico.
