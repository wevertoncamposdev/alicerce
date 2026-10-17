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
  (`defineRecordModule` + `registerModule`), páginas
  `app/(app)/<plural>/` e `app/(app)/<plural>/[id]/`; registro em
  `bootstrap.ts` e `alicerce.config.ts` (menu lateral, ícone, permissões).
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

## 4. Depois de gerar

```bash
cd backend  && npx tsc --noEmit && npm run lint && npm test
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

Se os campos do model mudaram depois que o gerador já rodou, rode
`npx prisma generate` (e, com Postgres acessível, `npx prisma migrate dev`)
de novo antes do checkpoint.
