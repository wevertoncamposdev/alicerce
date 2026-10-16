# 0003 — `Tenant` perde os campos de ONG, fica só a identidade genérica da instituição

## Status

Aceita — 2026-10-16.

## Contexto

`Tenant` (`backend/prisma/models/main/tenant.prisma`) hoje mistura duas
coisas num único model: a identidade genérica de uma instituição
multi-tenant (`id`, `legalName`, `slug`, `status`, timestamps, as relações
para `users`/`roles`/`permissions`/`audits`/`favorites`) e ~30 campos
específicos de ONG (`tradeName`, `registrationNumber`, `description`,
`mission`, `vision`, `values`, `category`, `primaryServiceArea`,
`partnershipType`, `coverageArea`, `organizationSize`, `foundedAt`,
`closedAt`, endereço completo — `street`/`number`/`district`/`city`/
`state`/`zipCode`/`country`/`complement`/`reference` —, contato completo —
`phone`/`mobilePhone`/`email`/`website`/`instagram`/`facebook`/`linkedin` —,
os booleanos `usesVolunteers`/`acceptsDonations`/`hasGovernmentPartnership`/
`isNonProfit`, e `notes`) mais quatro relações exclusivas de ONG
(`serviceAreas`, `boardTerms`, `boardMembers`, `documents`).

Isso é o item central da Fase 2 do `AGENTS.md` (§8) — "limpeza para template":
o Alicerce nasceu do domínio de ONG (`system_development`/TerceiroGestor) e
está sendo extraído como template genérico para qualquer domínio. Um
`Tenant` carregando conselho/estatuto/área-de-atuação de ONG é o oposto de
template genérico — qualquer projeto novo herdaria esses campos sem
precisar deles.

A decisão de remover o domínio de ONG como um todo já tinha um precedente
registrado: `docs/Alicerce v1.0.md` (linha 126) já decidiu remover
`TaskModule` do backend ("Remover pois não faz parte da arquitetura") por
não ter nenhum consumidor no frontend. `Tenant` é o mesmo problema em escala
maior — a diferença é que aqui não dá pra simplesmente apagar o model,
porque a identidade genérica (`legalName`/`slug`/`status`) é usada de
verdade por todo o sistema de autenticação/RLS.

Uma exploração do código (sessão de 2026-10-16) confirmou o tamanho real do
corte, inclusive partes menores do que o nome "Fase 2" sugere:
- `Person`, `Address`, `Contact`, `PersonDocument` e `Report`
  (`backend/prisma/models/features/person.prisma`, `report.prisma`) não têm
  nenhum módulo Nest — só existem no schema Prisma e no RLS extension. Zero
  controller/service a remover, só o schema e o `Set` de
  `tenant-rls.extension.ts`.
- `TaskModule` (`backend/src/modules/task/`) é auto-contido — nenhum outro
  módulo backend depende dele — e o frontend já foi desconectado dele de
  propósito, antecipando esta decisão.
- O único acoplamento real entre `User` e o domínio de ONG é o campo
  `personId` em `create-user.dto.ts`/`update-user.dto.ts` (usado via
  `connect: { id: personId }` em `user.service.ts`).

## Decisão

`Tenant` fica só com a identidade genérica de uma instituição multi-tenant:

**Fica**: `id`, `legalName`, `slug`, `status`, timestamps (`createdAt`/
`updatedAt`/`deletedAt`), e as relações genéricas — `users`, `roles`,
`userRoles`, `rolePermissions`, `permissions`, `audits`, `favorites`/
`favoriteNotes` (renomeadas para `examples`/`exampleNotes` numa etapa
posterior, ver `PLAN.md` Etapa 7.D).

**Sai**: todos os ~30 campos de ONG listados no Contexto, as relações
`serviceAreas`, `boardTerms`, `boardMembers`, `documents`, `people`,
`reports`, `tasks`, e os modelos que só existem para sustentar esses campos
— `Person`, `PersonAddress`, `Address`, `Contact`, `PersonDocument`,
`Report`, `Task`, `TenantArea`, `TenantBoardMember`, `TenantBoardTerm`,
`TenantDocument` — junto dos 13 enums que só esses modelos usam:
`TenantCategory`, `TenantServiceArea`, `PartnershipType`, `CoverageArea`,
`OrganizationSize`, `BoardRoleType`, `TenantDocumentType`, `ContactType`,
`ReportType`, `DocumentType`, `AddressType`, `TaskStatus`, `TaskPriority`.

A execução (apagar os arquivos `.prisma`, recriar as migrations do zero,
atualizar `tenant-rls.extension.ts`, remover `personId` de `User`, remover
`task.*` do `permission-catalog.ts`) é o `PLAN.md` Etapa 7.B — este ADR
registra o que e por quê, a etapa seguinte executa.

## Consequências

- Recriar as migrations do zero é destrutivo para qualquer dado local de
  desenvolvimento — aceito porque o Alicerce ainda não tem usuários/dados de
  produção reais; precisa de confirmação explícita antes de rodar (não é
  assumido automaticamente na Etapa 7.B).
- Projetos que começarem do template a partir de agora criam seus próprios
  campos de domínio no próprio model (`Tenant` ou outro) em vez de herdar
  campos de ONG que não usam.
- `TENANT_SCOPED_MODELS` (RLS) perde `Report`, `Task`, `TenantArea`,
  `TenantBoardMember`, `TenantBoardTerm`, `TenantDocument`, `Person` — menos
  superfície pra manter sincronizada manualmente a cada módulo novo.
- O módulo de exemplo do template deixa de ser `favorites` (remanescente do
  domínio antigo) e passa a ser `examples` — decisão e execução na Etapa
  7.D, não aqui.
