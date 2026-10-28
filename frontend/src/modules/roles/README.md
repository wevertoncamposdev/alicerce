# Módulo `roles`

Módulo de domínio para gestão de papéis (roles) do tenant. Serve como referência de
um módulo com **duas relações N:N geridas no próprio DetailView** (Role↔User,
Role↔Permission) — veja `frontend/src/modules/develop` (rota `/develop` da aplicação)
para o guia completo de como criar um módulo novo; este README só documenta o que
existe especificamente aqui.

## Estrutura real

```bash
roles/
├── config/
│   ├── contract.tsx      # defineRecordModule + registerModule — ligação ao registry
│   └── provider.ts       # dataHandlers (search/read/create/update/delete) via apiServer
├── actions/
│   └── roleService.ts    # Server Actions para atar/desatar usuário e permissão ao role
├── components/
│   ├── RoleListView.tsx          # "use client" — wrapper de ColumnDef para a TypeView (list)
│   ├── RolePermissionMatrix.tsx  # aba "Permissões" do Detail — matriz recurso x ação, autosave (8.3)
│   ├── RoleUsersHost.tsx         # relação "Usuários" do Detail — attach/detach com picker
│   └── columns.ts                # ColumnDef da tabela de listagem
├── types/types.ts        # RoleEntity, CreateRolePayload, UpdateRolePayload, ContextItem
└── constants/.gitkeep    # sem constantes próprias ainda
```

## Pontos específicos deste módulo

- **`views: ["list"]`** em `contract.tsx` — não usa `cards`/`graph` (nenhum
  módulo atual usa essas duas; não é um padrão obrigatório, é por módulo).
  "Criar" não é mais uma view (`?view=form`) desde o P13 — é o botão "+ Novo"
  que abre um `Sheet`, ver `CreateRecordSheet.tsx`.
- **Permissões não são mais attach/detach individual**: desde a 8.3 (Plano Base.md),
  a aba "Permissões" é uma matriz recurso x ação (`RolePermissionMatrix.tsx`) que
  consome `GET /roles/:id/permission-matrix` e manda o CONJUNTO INTEIRO marcado pra
  `PUT /roles/:id/permissions` a cada clique — não é um toggle por checkbox no
  backend, é um replace (ver `RolesService.replacePermissions`). O lado reverso
  (`modules/permissions/components/PermissionRolesHost.tsx`) continua só leitura.
- **A relação "Usuários" continua attach/detach** via `RoleUsersHost` +
  `RelationHost` (`lib/registry/relation-host.tsx`) — picker + toast + indicador de
  autosave. O lado reverso (`modules/users/components/UserRolesHost.tsx`) é só
  leitura — é o Role que administra a relação, por decisão de produto.
- **`provider.ts`** usa `apiServer` (nunca `fetch` direto) e resolve `tenantId` via
  `getSessionTenantId()` só para a leitura de relação (`readRoleUsers`) — os demais
  handlers recebem `tenantId` do próprio contexto da sessão no `apiServer`.
- **`actions/roleService.ts`** (não `config/client-actions.ts` — esse arquivo existiu
  como um rascunho duplicado e foi removido) é o único lugar com as Server Actions de
  attach/detach de usuário e com a matriz de permissões
  (`getPermissionMatrix`/`replaceRolePermissions`).

## Ao modificar este módulo

- Formulário (`formFields` em `contract.tsx`) e `types/types.ts` precisam ficar em
  sincronia com `CreateRoleDto`/`UpdateRoleDto` do backend
  (`backend/src/modules/role/dto/`).
- Qualquer permissão nova referenciada aqui (`role.*`) precisa existir no catálogo
  central do backend (`backend/src/core/authorization/permission-catalog.ts`).
