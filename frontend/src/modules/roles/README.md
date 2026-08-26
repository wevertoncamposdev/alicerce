# Template de Módulo Frontend

Este diretório é um template de estrutura para novos módulos/features do frontend.

## Estrutura

```bash
_template/
├── actions/        # Serviços de API - Actions Forms
├── components/     # Componentes React da feature
├── config/         # Configuração do Módulo, contract, providers...
├── hooks/          # Custom hooks da feature
├── services/       # Serviços de API
├── types/          # Tipos/Interfaces da feature
├── constants/      # Constantes e valores padrão
└── README.md       # Documentação específica da feature
```

## Como usar

1. **Copie esta estrutura** para `frontend/features/[nova-feature]/`.
2. **Renomeie ou crie** arquivos conforme necessário dentro de cada diretório.
3. **Implemente os padrões** descritos abaixo.
4. **Siga as convenções** do projeto antes de criar um PR.

## Padrões por arquivo

### `types/*.ts`

Define tipos/interfaces da feature. Exemplo:

```typescript
export interface EntityData {
  id: string;
  name: string;
  createdAt: string;
}

export interface EntityPayload {
  name: string;
}
```

### `constants/*.ts`

Constantes, valores padrão e mapeamentos. Exemplo:

```typescript
export const ENTITY_INITIAL_VALUES = { name: '' };

export const ENTITY_STATUS_OPTIONS = [
  { label: 'Ativo', value: 'ACTIVE' },
  { label: 'Inativo', value: 'INACTIVE' },
];
```

### `services/*.ts`

Serviços de API usando `apiRequest`. Exemplo:

```typescript
import { apiRequest } from '@/lib/api-client';

export async function fetchEntities(token: string) {
  return apiRequest<EntityData[]>('/entities', {
    method: 'GET',
    token,
  });
}
```

### `hooks/*.ts`

Custom hooks que gerenciam estado e lógica da feature. Exemplo:

```typescript
export function useEntities() {
  const [entities, setEntities] = useState<EntityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchEntities(token);
      setEntities(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Erro ao carregar.'));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entities, loading, error, reload: load };
}
```

Padrão de estados:

- `loading`: booleano para carregamento inicial
- `saving`: booleano para mutações (create, update, delete)
- `error`: string | null com mensagem de erro
- `reload`: função async para recarregar dados

### `components/*.tsx`

Componentes React que consomem hooks e shells. Exemplo:

```typescript
export default function EntityList() {
  const { entities, loading, error, reload } = useEntities();

  return (
    <DetailShell title="Entities" error={error}>
      <PainelSearchShell
        actions={<Button onClick={() => void reload()}>Atualizar</Button>}
      >
        <TypeView
          mode="table"
          data={entities}
          columns={columns}
          isLoading={loading}
        />
      </PainelSearchShell>
    </DetailShell>
  );
}
```

## Checklist de implementação

- [ ] Tipos definidos em `types/`
- [ ] Constantes em `constants/`
- [ ] Serviços de API em `services/`
- [ ] Hooks customizados em `hooks/`
- [ ] Componentes React em `components/`
- [ ] Página roteada em `app/main/[feature]/page.tsx`
- [ ] Build sem erro de tipagem
- [ ] Testes de fluxos críticos (opcional para MVP)

## Padrões do projeto

### Role-aware

Sempre passar `tenantId` em contexto via localStorage ou props:

```typescript
const { currentTenantId, token } = useAuth();

const data = await fetchData({ token, tenantId: currentTenantId });
```

### Autorizacao

Sempre validar permissões em componentes antes de renderizar ações:

```typescript
const { hasPermission } = useAuth();

if (!hasPermission('entity.create')) {
  return <div>Sem permissão</div>;
}
```

### Estados async

Sempre retornar `{ loading, saving, error, reload }` dos hooks:

```typescript
export function useEntity() {
  return {
    data: [],
    loading: false,
    saving: false,
    error: null,
    reload: async () => {},
  };
}
```

### Composição de telas

Usar shells padrão (`DetailShell`, `PainelSearchShell`, `SideShell`) para consistência:

```typescript
<DetailShell title="Feature" error={error}>
  <PainelSearchShell actions={<Button>Action</Button>}>
    {/* conteudo */}
  </PainelSearchShell>
</DetailShell>
```

## Exemplos completos

Veja os módulos existentes:

- `features/users/` - Exemplo completo de CRUD com usuários
- `features/roles/` - Exemplo com relações (Role-User, Role-Permission)
- `features/tenants/` - Exemplo com contexto de tenant

## Troubleshooting

### Erro: "Sem permissão para criar"

- Verifique se o usuário tem a permissão no backend
- Valide `hasPermission()` antes de renderizar o botão

### Dados não atualizam ao trocar tenant

- Verifique se `reload()` eh chamado quando `currentTenantId` muda
- Use `useCallback` com dependências corretas

### TypeScript error em tipos

- Certifique-se de que tipos sao exportados corretamente
- Verifique imports em `types/*.ts`

---

Dúvidas? Revise o README do frontend em `frontend/README.md` ou os critérios de smoke visual em `plan/Plan_Fase2_Hardening_UX.md`.
