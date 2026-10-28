# ADR 0007 — Modelo de acesso (RBAC)

- Status: aceito
- Data: 2026-10-18
- Escopo: autorizado pelo ADR 0006 (Fase 3 do `Plano Base.md`).
  - Em `core/`: `backend/src/core/authorization/**` (novo
    `permission-catalog-sync.ts` + `PermissionCatalogSyncService`),
    `backend/src/core/common/decorators/roles.decorator.ts` (removido na
    etapa 3.6), `backend/src/core/common/guards/roles-permissions.guard.ts`,
    `backend/src/core/common/interceptors/audit.interceptor.ts` (`isAuditable`
    ganha `PUT`), `backend/src/core/common/types/http.types.ts`
    (`JwtPayload`), `backend/src/core/auth/auth.service.ts` (JWT,
    `AuthUserContext`).
  - Fora de `core/`: `backend/src/modules/role/**`,
    `backend/src/modules/permission/**`, `backend/src/modules/user/
    user.service.ts` (checagem de último admin), `backend/prisma/seed.ts`,
    `backend/scripts/`, `backend/prisma/models/main/access.prisma` e
    migrations novas. No frontend, só na etapa 3.6:
    `frontend/src/contexts/auth-context.tsx`, `frontend/src/lib/
    auth-types.ts`, `frontend/src/lib/auth-server.ts`,
    `frontend/src/app/(app)/dashboard/page.tsx`.
  - Nada além dessa lista em `core/` sem perguntar.

## Contexto

Hoje o acesso a uma rota é checado de duas formas ao mesmo tempo:
`@Roles('ADMIN')`, que lê `roles` direto do payload do JWT (nunca revalidado
até o token expirar, 15 min), **e** `@Permissions(...)`, que consulta
`PermissionCacheService` (cache Redis de TTL curto, cai pro Postgres no
miss). As duas precisam passar — então revogar uma permissão de um usuário
não tem efeito prático enquanto a role ainda bater, e todo controller carrega
os dois decorators em paralelo, redundantes na prática (nenhuma rota hoje
usa `@Roles` sem `@Permissions` ao lado).

O catálogo de permissões (`PERMISSION_CATALOG`, já extraído como fonte única
desde antes desta fase) só é materializado em `Permission` de um tenant no
momento em que esse tenant é criado (onboarding público ou seed de
desenvolvimento) — um tenant já existente nunca recebe automaticamente uma
permissão nova adicionada ao catálogo depois. E hoje é possível
criar/editar/excluir `Permission` livremente via `POST/PATCH/DELETE
/permissions`, o que contradiz a ideia de catálogo como fonte única definida
por código.

## Decisão

1. **Rotas checam só permissões.** `@Roles(...)` sai de todos os
   controllers (etapa 3.2). `RolesPermissionsGuard` passa a avaliar somente
   `@Permissions`. O mecanismo de roles inteiro (decorator `Roles`,
   `ROLES_KEY`, o bloco de checagem no guard, o campo `roles` no JWT e no
   `AuthUserContext`) é removido por completo na etapa 3.6, depois que
   nenhum controller mais o referencia.
2. **Catálogo sincronizado.** `syncPermissionCatalog()` (nova função,
   `core/authorization/permission-catalog-sync.ts`) cria, para todo tenant
   existente, as permissões do catálogo que ainda não existem
   (`createMany` + `skipDuplicates`, idempotente). Roda via script
   (`npm run sync:permissions`, a ser plugado no passo de deploy na Fase 10)
   e é reaproveitada pelo seed de desenvolvimento.
3. **Permissão é somente leitura via API.** Os endpoints
   `POST/PATCH/DELETE /permissions` são removidos; `permission.create`,
   `permission.update` e `permission.delete` saem do catálogo. Criar/editar
   permissão passa a ser só mudar o código do catálogo + rodar o sync.
4. **Papel de sistema.** `Role.isSystem: boolean` (default `false`)
   substitui `type === 'ADMIN'` em toda checagem de autorização (último
   admin do tenant, bloqueio de exclusão). Um papel `isSystem` não pode ser
   excluído (409) nem renomeado; o sync sempre garante que ele tenha todas
   as permissões concedíveis do catálogo (`TENANT_ADMIN_PERMISSION_NAMES`).
   A coluna `type`/enum `RoleType` **continua existindo** — só para de ser
   lida para decidir acesso. Não removo a coluna nesta fase: ela ainda é
   campo público do CRUD de papel (criação/edição) e alimenta a UI de
   papéis, que esta fase não investiga nem altera — remover o enum seria uma
   mudança de contrato de API/frontend fora do escopo descrito no
   `Plano Base.md` para esta fase.
5. **Matriz de permissões do papel.** `GET /roles/:id/permission-matrix`
   (catálogo × marcado/desmarcado) e `PUT /roles/:id/permissions` (substitui
   o conjunto em lote, uma transação, uma invalidação de cache) — endpoints
   novos, mesmo padrão de permissão (`role.read`/`role.assign`) dos demais.

## Consequências

- `RoleType`/coluna `type` ficam como metadado inerte na autorização —
  decisão explícita, revisável numa fase futura se o time quiser remover de
  vez (exigiria tocar o CRUD de papel e a UI correspondente).
- Enquanto a etapa 3.2 remove `@Roles` dos controllers mas a 3.6 ainda não
  rodou, o bloco de checagem de roles no guard e o campo `roles` no JWT
  ficam como código morto (nunca mais exercitados, pois nenhum handler
  declara `requiredRoles`) — intencional, para manter cada etapa pequena e
  committável.
- `syncPermissionCatalog` nunca remove uma permissão ou uma concessão já
  existente — só adiciona o que falta. Remoção de permissão do catálogo
  (como `permission.create/update/delete` nesta mesma fase) é sempre uma
  migration explícita, nunca automática via sync.
- Nenhuma mudança de UI nesta fase — a matriz de permissões (3.5) é só
  backend; a tela em `/roles` que a consome é a Fase 8.3.
