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
  `backend/src/modules/feedbacks/features/comments/`, seguindo exatamente o
  padrão já usado por `examples/features/notes/` (rota nested
  `feedbacks/:feedbackId/comments`, `onDelete: Cascade` no schema). No
  frontend, exibida via `RelationTablePanel` (mesmo componente que as notes
  de `examples` já usavam).
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

## 5. Depois de gerar

```bash
cd backend  && npx tsc --noEmit && npm run lint && npm test
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

Se os campos do model mudaram depois que o gerador já rodou, rode
`npx prisma generate` (e, com Postgres acessível, `npx prisma migrate dev`)
de novo antes do checkpoint.

## 6. Dados pessoais e exclusão (LGPD)

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
