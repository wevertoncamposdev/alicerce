# Arquitetura Visual - Padrões de Composição de Telas

Este documento mostra como cada tipo de tela é composto usando os shells e componentes implementados nas Fases 1 e 2.

## Padrão 1: Página de Listagem com CRUD

**Usado em**: Usuários, Tenants

```
┌─────────────────────────────────────────────────────────────────────┐
│ DetailShell (título + descrição + erro global)                     │
│                                                                       │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ SideShell                │  │ PainelSearchShell (Listagem)     │ │
│  │ (Formulário Create/Edit) │  │                                  │ │
│  │                          │  │  [Título] [Filtros]  [Ações]    │ │
│  │  - Inputs                │  │  ┌──────────────────────────────┐│ │
│  │  - Validação             │  │  │ DataTable                    ││ │
│  │  - Botões (Submit)       │  │  │ - Columns com Tanstack       ││ │
│  │  - Erro inline           │  │  │ - Loading message            ││ │
│  │                          │  │  │ - Empty message              ││ │
│  └──────────────────────────┘  │  └──────────────────────────────┘│ │
└─────────────────────────────────────────────────────────────────────┘
```

**Componentes**: DetailShell + SideShell + PainelSearchShell + DataTable

**Hooks**: useFeature() → { data, loading, saving, error, reload }

---

## Padrão 2: Página de Listagem com Relações

**Usado em**: Papéis (com usuários e permissões associadas)

```
┌─────────────────────────────────────────────────────────────────────┐
│ DetailShell (título + descrição)                                   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PainelSearchShell (Listagem)                                 │  │
│  │  [Título] [Filtros]  [Ações: Criar, Atualizar]              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │ TypeView (mode="table")                                │ │  │
│  │  │ - Columns: nome, tipo, descrição, ações               │ │  │
│  │  │ - Loading/Empty states                                │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ RelationShell (Vinculações)                                  │  │
│  │  [Título] [Descrição]                                        │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────┐ ┌───────────────────────┐  │  │
│  │  │ Vincular Usuários           │ │ Vincular Permissões  │  │  │
│  │  │ [Input] [Input] [Botão]     │ │ [Input] [Input] [Btn]│  │  │
│  │  └─────────────────────────────┘ └───────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Componentes**: DetailShell + PainelSearchShell + TypeView + RelationShell

**Hooks**: useRoles() → { roles, loading, saving, error, assignUser, reload }

---

## Padrão 3: Dashboard / Resumo

**Usado em**: Dashboard principal

```
┌─────────────────────────────────────────────────────────────────────┐
│ DetailShell (título + descrição + erro global)                     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PainelSearchShell (Indicadores)                              │  │
│  │  [Título]                         [Ações: Atualizar]        │  │
│  │                                                                │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │  │
│  │  │ StatCard    │ │ StatCard    │ │ StatCard    │            │  │
│  │  │ Usuários: 5 │ │ Papéis: 3   │ │ Perms: 12   │            │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │  │
│  │  ┌─────────────┐                                              │  │
│  │  │ StatCard    │                                              │  │
│  │  │ Audits: 42  │                                              │  │
│  │  └─────────────┘                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Componentes**: DetailShell + PainelSearchShell + StatCard

**Hooks**: useUsers(), useRoles(), usePermissions(), useAudit()

---

## Padrão 4: Autenticação

**Usado em**: Login, Registro

```
┌─────────────────────────────────────────────────────┐
│ Fundo com gradient                                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Logo/Título                                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ SideShell (Formulário)                       │  │
│  │  [Título] [Descrição]                        │  │
│  │                                               │  │
│  │  [Label] [Input]                             │  │
│  │  [Label] [Input]                             │  │
│  │  [Erro Alert]                                │  │
│  │  [Botão Submit]                              │  │
│  │  [Link para outra página]                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Componentes**: SideShell + Input + Button

**Hooks**: useAuth() → { signIn, signUp, signOut }

---

## Estados Padrão em Todas as Páginas

### Loading (Carregamento)
```
Estado: isLoading = true

DataTable:
┌──────────────────────────┐
│ Carregando usuarios...   │
└──────────────────────────┘

TypeView:
┌──────────────────────────┐
│ Carregando papeis...     │
└──────────────────────────┘

StatCard:
┌──────────────┐
│ Usuários     │
│ Carregando..│
└──────────────┘
```

### Empty (Vazio)
```
Estado: data.length = 0

DataTable / TypeView:
┌──────────────────────────┐
│ Nenhum usuario           │
│ encontrado.              │
└──────────────────────────┘

Dashboard (sem dados):
┌──────────────────────────┐
│ Nenhum dado disponivel.  │
│ Crie usuarios, papeis... │
└──────────────────────────┘
```

### Error (Erro)
```
Estado: error = "mensagem"

Alert em DetailShell:
┌─────────────────────────────────────────┐
│ ⚠ Falha ao carregar usuarios.           │
│   Tente novamente mais tarde.           │
└─────────────────────────────────────────┘
```

### Sem Tenant Selecionado
```
Estado: currentTenantId = null

Alert em DetailShell:
┌──────────────────────────────────────┐
│ ⚠ Selecione um tenant no modulo de   │
│   tenants para gerenciar usuarios.   │
└──────────────────────────────────────┘
```

### Sem Permissão
```
Estado: !hasPermission("user.create")

Botão:
[Novo usuario] → Desabilitado

Campo de ação:
"Sem permissao para criar usuario."
```

---

## Fluxo de Dados

```
┌────────────────────────────┐
│ useAuth()                  │
│ - token                    │
│ - currentTenantId          │
│ - hasPermission()          │
│ - signIn/signUp/signOut    │
└────────────────────────────┘
         ↓
┌────────────────────────────┐
│ useFeature()               │
│ - fetchFeature()           │
│ - createFeature()          │
│ - updateFeature()          │
│ - deleteFeature()          │
└────────────────────────────┘
         ↓
┌────────────────────────────┐
│ Componente React           │
│ - Renderiza dados          │
│ - Mostra estados           │
│ - Captura eventos          │
└────────────────────────────┘
         ↓
┌────────────────────────────┐
│ Shells + TypeView          │
│ - DetailShell              │
│ - SideShell                │
│ - PainelSearchShell        │
│ - RelationShell            │
│ - DataTable / TypeView     │
└────────────────────────────┘
```

---

## Checklist para Nova Página

1. **Envolver em DetailShell** (título + descrição)
2. **Usar SideShell** para formulários (se houver)
3. **Usar PainelSearchShell** para listagens (se houver)
4. **Usar RelationShell** para relações (se houver)
5. **Usar TypeView ou DataTable** para dados
6. **Passar loadingMessage e emptyMessage** em tabelas
7. **Chamar hasPermission()** antes de renderizar ações
8. **Validar currentTenantId** se dado for tenant-scoped
9. **Render error ao lado de error prop** do DetailShell
10. **Testar em mobile e desktop**

---

## Exemplo Completo: Página de Usuários

```typescript
export default function UsersPage() {
  const { users, loading, saving, error, reload } = useUsers();
  const { hasPermission, currentTenantId } = useAuth();
  const [editingUser, setEditingUser] = useState<UserEntity | null>(null);

  return (
    <DetailShell
      title="Usuarios"
      description="Gestao de usuarios."
      error={error}
    >
      {!currentTenantId ? (
        <div className="alert">
          Selecione um tenant...
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SideShell title="Novo usuario">
          <UsersForm
            mode={editingUser ? "edit" : "create"}
            initialUser={editingUser}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={() => setEditingUser(null)}
          />
        </SideShell>

        <PainelSearchShell
          title="Listagem"
          actions={
            <Button onClick={() => reload()}>Atualizar</Button>
          }
        >
          <DataTable
            data={users}
            columns={columns}
            isLoading={loading}
            loadingMessage="Carregando usuarios..."
            emptyMessage="Nenhum usuario encontrado."
          />
        </PainelSearchShell>
      </div>
    </DetailShell>
  );
}
```

---

**Última atualização**: 17 de junho de 2026  
**Status**: ✅ Todas as telas atualizadas e validadas
