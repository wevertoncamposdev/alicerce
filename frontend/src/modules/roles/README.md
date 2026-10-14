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
│   ├── RoleListView.tsx       # "use client" — wrapper de ColumnDef para a TypeView (list)
│   ├── RolePermissionsHost.tsx # aba "Permissions" do DetailView — attach/detach com picker
│   ├── RoleUsersHost.tsx       # aba "Users" do DetailView — attach/detach com picker
│   └── columns.ts              # ColumnDef da tabela de listagem
├── types/types.ts        # RoleEntity, CreateRolePayload, UpdateRolePayload, ContextItem
└── constants/.gitkeep    # sem constantes próprias ainda
```

## Pontos específicos deste módulo

- **`views: ["list"]`** em `contract.tsx` — não usa `cards`/`graph` (só
  `favorites` usa essas duas hoje; não é um padrão obrigatório, é por módulo).
  "Criar" não é mais uma view (`?view=form`) desde o P13 — é o botão "+ Novo"
  que abre um `Sheet`, ver `CreateRecordSheet.tsx`.
- **Relações são bidirecionais nos dois sentidos, mas só um lado é editável**: as abas
  `users`/`permissions` aqui em `RoleUsersHost`/`RolePermissionsHost` usam
  `RelationHost` (`lib/registry/relation-host.tsx`) com attach/detach completo
  (picker + toast + indicador de autosave). Os lados reversos
  (`modules/users/components/UserRolesHost.tsx`,
  `modules/permissions/components/PermissionRolesHost.tsx`) são só leitura — é o Role
  que administra a relação, por decisão de produto, não uma limitação técnica.
- **`provider.ts`** usa `apiServer` (nunca `fetch` direto) e resolve `tenantId` via
  `getSessionTenantId()` só para as duas leituras de relação
  (`readRolePermissions`/`readRoleUsers`) — os demais handlers recebem `tenantId` do
  próprio contexto da sessão no `apiServer`.
- **`actions/roleService.ts`** (não `config/client-actions.ts` — esse arquivo existiu
  como um rascunho duplicado e foi removido) é o único lugar com as Server Actions de
  attach/detach; `RoleUsersHost`/`RolePermissionsHost`/`UserRolesHost` importam dele.

## Ao modificar este módulo

- Formulário (`formFields` em `contract.tsx`) e `types/types.ts` precisam ficar em
  sincronia com `CreateRoleDto`/`UpdateRoleDto` do backend
  (`backend/src/modules/role/dto/`).
- Qualquer permissão nova referenciada aqui (`role.*`) precisa existir no catálogo
  central do backend (`backend/src/core/authorization/permission-catalog.ts`).
