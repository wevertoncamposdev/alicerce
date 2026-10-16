# Plano de Fechamento — Alicerce v1.0

> Baseado em clone e leitura real do repositório em 02/09/2026 (branch atual). Este plano substitui suposições anteriores — vários itens que constavam como pendentes já foram resolvidos; outros são mais profundos do que pareciam.

---

## 0. Diagnóstico real do estado atual

### O que já está pronto (não refazer)

| Item | Status real |
| --- | --- |
| `findOne` em Role e Permission (`@Get(':id')` + service) | ✅ Existe e funciona |
| `tenantId` em `findPermissionsOfRole` / `findUsersOfRole` | ✅ Já é passado corretamente |
| Painel reverso em Permission (`GET :id/roles`) | ✅ Existe (`listRoles` + `findRolesOfPermission`) |
| `modules/roles/config/client-actions.ts` | ✅ Já extraído |
| Módulos frontend `tenants/`, `users/`, `roles/`, `permissions/` | ✅ Existem, registrados via `defineRecordModule` |
| Página de detail unificada via `DetailViewScreen` | ✅ Todas as entidades usam o mesmo componente de página |
| Audit model no Postgres (`Audit`) | ✅ Modelado (`entity`, `entityId`, `before`, `after`, `action`) |
| Person como extensão 1:1 de User | ✅ Modelado no schema (`Person.userId` único) |

### O que está pendente de verdade (gaps confirmados no código)

1. **Não existe um componente de abas (tabs) para relations.** O slot `bottom` do `DetailLayout` é único — hoje `roles/[id]` empilha `RolePermissionsHost` + `RoleUsersHost` verticalmente com `<div className="space-y-6">`. Isso é exatamente o padrão `[role | permission | tenant]` que você quer, mas **ainda não foi construído como abas reutilizáveis**.
2. **`RelationTablePanel` não é genérico.** Está fisicamente acoplado a `FavoriteNote` (import direto de `notes-provider`, colunas hardcoded `content`/`user.email`). Não pode ser reaproveitado para roles/permissions/tenants sem refatoração.
3. **`UserRolesHost`, `RolePermissionsHost`, `RoleUsersHost`, `PermissionRolesHost` são 4 implementações paralelas e duplicadas** do mesmo padrão (lista + picker + attach/detach otimista), cada uma reescrita à mão. Isso é o oposto do "mesmo mecanismo para tudo" que você quer.
4. **User não tem relation tab de Permission nem de Tenant.** Hoje só existe `UserRolesHost`. Falta:
   - `user.detail` → tab Permissions (via papel indireto: permissões efetivas do usuário, herdadas das roles — precisa decidir se é uma visão agregada read-only ou uma relação direta)
   - `user.detail` → tab Tenant — mas atenção: **User→Tenant é FK direta (1:N), não N:N**. Não é uma RelationShell, é campo de contexto/metadado. Isso precisa ser esclarecido no design (seção 2).
5. **Tenant não tem nenhuma relation tab.** Não existe painel de "usuários deste tenant" nem "roles deste tenant" no `tenant.detail`. O backend também não expõe `GET /tenant/:id/users`.
6. **MetaDataShell não tem Notes/Anexos genéricos.** Só existem `ContextPanel` e `AuditPanel`. O padrão de "notes" só existe hoje como feature bespoke de `favorites` (`FavoriteNote`), não como capacidade do MetaDataShell reaproveitável em qualquer módulo.
7. **`modules/roles/actions/roleService.ts` ainda importa tipo de `@/features/roles/role.types`** — bloqueia a exclusão total de `features/`.
8. **Audit ainda é tela solta (`app/(app)/audit/page.tsx`), não é um módulo registrado** (`modules/audit/` não existe, apesar de estar planejado). Usa hooks legados de `features/audit`.
9. **Dashboard (`app/(app)/dashboard/page.tsx`) usa 4 hooks legados** (`features/audit`, `features/permissions`, `features/roles`, `features/users`) — maior bloqueador para deletar `features/`.
10. **Segurança multi-tenant mais ampla:** `RolesController.search()` e `PermissionsController.search()` **não filtram por `tenantId`** — qualquer usuário autenticado pode buscar roles/permissions de outros tenants via `@Search()`. Isso é mais grave do que o item já resolvido de `findPermissionsOfRole`.
11. **Auth (login/register) segue 100% em `features/auth/`**, fora do padrão de módulos. Não precisa virar um "RecordModule" (autenticação não é uma entidade administrável), mas também não pode ficar como último bloco de `features/` — precisa de um destino definitivo (`modules/auth/` como módulo de infraestrutura, ou `core/` no frontend, para simetria com o backend).

---

## 2. Decisão de design que precisa ser fechada antes de codar

**User → Tenant não é uma RelationShell.** É uma FK obrigatória (`User.tenantId`, 1:N a partir do Tenant). Renderizar isso como aba igual a Role/Permission (que são N:N) criaria inconsistência conceitual na sua própria taxonomia (Módulo Relacionado vs. campo simples).

Proposta:

- **User.detail** → abas: **`[Roles | Permissions]`**. O Tenant do usuário aparece no **MetaDataShell** (painel lateral), como já ocorre em `favorites` (`{ key: "tenantId", label: "Tenant", value: record.tenant.legalName }`) — é meta-informação de contexto, não uma relação administrável a partir do usuário.
- **Tenant.detail** → abas: **`[Users | Roles]`** — aqui sim faz sentido, porque a partir do tenant você **está** administrando uma coleção (todos os usuários daquele tenant, todas as roles daquele tenant). Essa é a direção inversa da mesma relação FK, e funciona bem como RelationShell read+navigate (não attach/detach, já que a associação é criada no `create User`, não numa tabela pivot).
- **Permissions dentro de User** — como Permission chega ao User só indiretamente via Role (não existe `UserPermission` no schema), a aba "Permissions" em `user.detail` deve ser **read-only agregada** ("permissões efetivas herdadas das roles atuais"), não um attach/detach direto. Isso evita criar um modelo de dados novo (`UserPermission`) sem necessidade — mantém a fonte da verdade em `RolePermission` + `UserRole`.

Isso preserva a taxonomia que você definiu (Módulo / Módulo Relacionado / Feature / Extensão) sem forçar todo relacionamento a virar aba de attach/detach.

---

## 3. Plano de execução

Ordem pensada para não bloquear você: primeiro o **motor genérico de RelationShell com abas** (é o item que desbloqueia tudo mais), depois aplicar nas 4 entidades, depois o hardening de segurança, por último a limpeza de legado.

### Fase 1 — Motor genérico: RelationShell com abas (fundação, bloqueia tudo abaixo)

**Objetivo:** um único componente reutilizável que renderiza `[Tab A | Tab B | Tab C]`, cada aba usando o mesmo host genérico de attach/detach — eliminando as 4 implementações duplicadas.

| # | Entrega | Onde |
| --- | --- | --- |
| 1.1 | `RelationShell.tsx` — componente de abas (usar `Tabs` do shadcn/ui), recebe `tabs: { label, content }[]` | `components/DetailView/RelationView/RelationShell.tsx` |
| 1.2 | Genericizar `RelationTablePanel` → `RelationCrudHost<T>`: recebe `columns`, `dataHandlers` (`list`, `attach`, `detach`, opcionalmente `create`), deixa de importar `notes-provider` diretamente | `components/DetailView/RelationView/RelationCrudHost.tsx` |
| 1.3 | Consolidar `UserRolesHost` + `RolePermissionsHost` + `RoleUsersHost` + `PermissionRolesHost` em **uma única fábrica** `createRelationHost(config)` que os 4 casos de uso instanciam com config diferente (columns + endpoints), não com JSX duplicado | `lib/registry/relation-host.tsx` (novo) |
| 1.4 | Ajustar `DetailLayout<T>` (`lib/registry/types.ts`) para suportar `relations?: (ctx) => RelationTabConfig[]` como slot dedicado, distinto de `bottom` (que fica livre para Notes/outras seções) | `lib/registry/types.ts` |
| 1.5 | Ajustar `DetailViewScreen` para renderizar `RelationShell` quando `relations` estiver definido | `screens/DetailViewScreen.tsx` |
| 1.6 | Checkpoint: `npx tsc --noEmit` + `npm run build` no frontend | — |

Critério de aceite da Fase 1: `favorites` continua funcionando sem quebrar (regressão zero), e existe um componente `RelationShell` testável isoladamente com dados mock.

### Fase 2 — Backend: rotas e segurança que faltam

| # | Entrega | Onde |
| --- | --- | --- |
| 2.1 | `GET /tenant/:id/users` — listar usuários de um tenant (`findUsersOfTenant`) | `tenant.controller.ts` + `tenant.service.ts` |
| 2.2 | `GET /tenant/:id/roles` — listar roles de um tenant | idem |
| 2.3 | Endpoint de permissões efetivas do usuário: `GET /user/:id/permissions` (agregação: roles do user → permissions das roles, `DISTINCT`) | `user.controller.ts` + `user.service.ts` |
| 2.4 | **P0 segurança:** filtrar `tenantId` em `RolesController.search()` e `PermissionsController.search()` (hoje vazam entre tenants) | `roles.service.ts`, `permissions.service.ts` |
| 2.5 | Corrigir import de tipo remanescente: `modules/roles/actions/roleService.ts` para de importar `@/features/roles/role.types` | frontend |
| 2.6 | Checkpoint: `npx tsc --noEmit` no backend + teste manual dos 3 endpoints novos via Swagger (`openapi.json` já existe, atualizar) | — |

### Fase 3 — Aplicar RelationShell nas 4 entidades

| # | Entrega |
| --- | --- |
| 3.1 | `user.detail` → `relations: [{ label: "Roles", ... }, { label: "Permissions", readOnly: true, ... }]` usando o motor da Fase 1. Tenant sai do slot de relations e vira `ContextItem` no MetaDataShell (já é quase isso hoje — só ajustar). |
| 3.2 | `role.detail` → `relations: [{ label: "Permissions" }, { label: "Users" }]` — substitui o `space-y-6` atual por abas de verdade. |
| 3.3 | `permission.detail` → `relations: [{ label: "Roles" }]` (já existe o backend, falta plugar no novo motor). |
| 3.4 | `tenant.detail` → `relations: [{ label: "Users", readOnly: true }, { label: "Roles", readOnly: true }]` usando os endpoints da Fase 2.1/2.2. |
| 3.5 | Checkpoint visual: navegar manualmente pelas 4 telas de detail e validar troca de abas, attach/detach, e que nenhum `ColumnDef` com `cell` atravessa a fronteira Server→Client (regra recorrente do projeto). |

### Fase 4 — MetaDataShell completo (Notes + Anexos genéricos)

Hoje "Notes" só existe hardcoded em `favorites`. Para virar produto, precisa ser capacidade do próprio MetaDataShell, disponível a qualquer módulo que optar por ativá-la.

| # | Entrega |
| --- | --- |
| 4.1 | Modelar `Note` genérico no backend: `entity`, `entityId`, `tenantId`, `authorId`, `content` (substituindo o padrão específico `FavoriteNote` por uma tabela polimórfica reaproveitável — decisão: **uma tabela `Note` genérica** é mais alinhada ao objetivo de "mesmo mecanismo para tudo" do que replicar `XxxNote` por módulo) |
| 4.2 | `NotesPanel` genérico dentro de `MetaDataView`, ativado via `detailConfig.notesEnabled: true` |
| 4.3 | Migrar `favorites` para consumir o `NotesPanel` genérico (valida a generalização no próprio módulo que originou o padrão) |
| 4.4 | (Opcional v1.0, pode ir para v1.1) Anexos — mesma lógica de tabela polimórfica, mas como upload; se o tempo apertar, cortar do escopo do v1.0 e documentar como próximo passo |
| 4.5 | Aplicar `notesEnabled: true` em `user`, `role`, `tenant` (útil: "por que essa role foi criada", "observação sobre esse usuário") |

### Fase 5 — Módulo Audit real (fecha item pendente antigo)

| # | Entrega |
| --- | --- |
| 5.1 | Backend: `SearchAuditDto` + `@Search()` no controller de audit (hoje audit não tem controller próprio dedicado — confirmar se existe e só falta o endpoint, ou se precisa criar do zero) |
| 5.2 | Frontend: `modules/audit/` seguindo exatamente o mesmo contrato (`defineRecordModule`), `views: ["list"]` apenas, sem `create/update/delete` (módulo read-only, o próprio `RecordModuleDataHandlers<T>` já suporta isso opcionalmente) |
| 5.3 | Substituir `app/(app)/audit/page.tsx` (hoje usa `features/audit/components/AuditTable` direto) para usar `DetailViewScreen`/`TypeViewScreen` como as demais telas |
| 5.4 | Reescrever `dashboard/page.tsx` para não depender de `features/audit`, `features/permissions`, `features/roles`, `features/users` — usar os `dataHandlers.search` dos módulos já registrados |

### Fase 6 — Limpeza final de legado

| # | Entrega |
| --- | --- |
| 6.1 | Mover `features/auth/` → `modules/auth/` (ou `core/auth/` no frontend, espelhando `core/auth` do backend) — decisão de nomenclatura sua, mas precisa sair de `features/` |
| 6.2 | Deletar `features/audit`, `features/permissions`, `features/roles`, `features/users` (só depois de 5.3 e 5.4 estarem prontos — hoje são os únicos consumidores) |
| 6.3 | Deletar `components/shells/`, exceto `SideShell` → mover para `components/Layout/` (conforme já estava planejado) |
| 6.4 | Grep final de verificação: `grep -rn "from ['\"]@/features" frontend/src` deve retornar vazio |
| 6.5 | Checkpoint final: `npm run build` limpo no frontend e no backend, sem warnings de import quebrado |

---

## 4. Backlog explicitamente fora do v1.0 (não distrair agora)

- Anexos genéricos (Fase 4.4) — se apertar o tempo, primeiro entregar Notes e documentar Anexos como v1.1
- Milestones B (RLS Postgres), D (Cache Redis), F (Observabilidade/OTel) do `backend/issues.md` — são hardening de produção, não bloqueiam o "mesmo mecanismo para tudo"; ficam para depois do v1.0 fechado
- `Task` e `Report` — já scoped out formalmente
- Entidades novas do FAROL (`Demanda`, `AnaliseDeImpacto`, etc.) — só começam depois que o alicerce estiver 100% fechado, que é exatamente o objetivo deste plano

---

## 5. Por que essa ordem

A Fase 1 é a mais cara e a mais importante: sem o motor genérico de `RelationShell`, cada nova entidade do FAROL vai te custar reescrever attach/detach na mão de novo (como aconteceu 4 vezes com role/permission/user). É o investimento que faz o "me preocupar só com os módulos" virar realidade. As Fases 2–3 aplicam esse motor nas 4 entidades reais, o que também serve de teste de carga do design (se o motor genérico aguenta os 4 casos com nuances diferentes — reverse-only em Permission/Tenant, read-only em Permissions-do-User — ele está maduro o suficiente pra qualquer entidade futura). Fase 4 fecha a experiência de produto (metadados completos). Fase 5 fecha uma dívida antiga (audit). Fase 6 é só faxina, mas necessária pra você não ter dois padrões coexistindo — que é justamente o risco que você apontou.
