# Padroes para Agentes de Codigo - Frontend

Este documento define regras e padroes para agentes de codigo auxiliarem no desenvolvimento frontend deste projeto.

## 1. Contexto do Projeto

- **Framework**: Next.js 16 com App Router
- **Estilo**: TypeScript, arquitetura por features
- **Composicao de UI**: Shells (DetailShell, SideShell, PainelSearchShell, RelationShell) + TypeView
- **Autorizacao**: Context auth-context + authz.ts (regras por rota)
- **Tenant**: Multi-tenant com contexto via localStorage

## 2. Arquitetura por Fases

### Fase 1: Fundacao
Padronizacao de contratos de dados e comportamento tenant-aware.
- `lib/api-client.ts`: cliente HTTP unificado
- `contexts/auth-context.tsx`: sessao e tenant centralizados
- `types/api.ts` e `types/async-state.ts`: contratos compartilhados
- Hooks padronizados: `loading`, `saving`, `error`, `reload`

**Criterio**: Build sem erro, contratos consistentes entre modulos.

### Fase 2: UI Arquitetural
Reducao de duplicacao estrutural com shells reutilizaveis.
- `components/shells/`: DetailShell, SideShell, RelationShell, PainelSearchShell
- `components/TypeView/`: TableView e GridView
- `components/DataTable.tsx`: tabela padronizada
- Migracao de paginas para composicao de shells

**Criterio**: Todas as paginas principais com shells, responsividade validada.

### Fase 3: Productizacao
Qualidade, governanca e escalabilidade.
- `tests/`: testes de fluxos criticos (auth, tenant scope, RBAC)
- `features/_template/`: template reutilizavel de modulo
- `README.md` e `AGENTS.md`: documentacao atualizada

**Criterio**: Testes implementados, template validado, documentacao coerente.

## 3. Regras de Implementacao

### 3.1 Hooks de Feature
Todo hook de dados deve retornar:

```typescript
export function useFeature(): FeatureResult {
  const { token, currentTenantId } = useAuth();
  const [data, setData] = useState<FeatureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !currentTenantId) return;
    setLoading(true);
    try {
      const result = await fetchFeature({ token, tenantId: currentTenantId });
      setData(result);
    } catch (err) {
      setError(toErrorMessage(err, 'Erro ao carregar.'));
    } finally {
      setLoading(false);
    }
  }, [token, currentTenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, saving, error, reload: load };
}
```

**Regras**:
- Sempre verificar `token` e `currentTenantId` antes de carregar.
- Usar `useCallback` com dependencias corretas.
- Retornar funcao `reload` para recarregar dados.
- Estados: `loading` (inicial), `saving` (mutacoes), `error` (mensagem).

### 3.2 Servicos de API
Use `apiRequest` do `lib/api-client.ts`:

```typescript
export async function fetchFeatures(params: FetchParams): Promise<FeatureData[]> {
  return apiRequest<FeatureData[]>('/features', {
    method: 'GET',
    token: params.token,
    tenantId: params.tenantId,
  });
}
```

**Regras**:
- Sempre tipar a resposta genericamente: `apiRequest<T>(...)`
- Passar `token` para autenticacao e `tenantId` para isolamento.
- Nao capturar erros em servicos; deixar propagarem para hook.

### 3.3 Componentes React
Use shells + TypeView para composicao:

```typescript
export default function FeaturePage() {
  const { data, loading, error, reload } = useFeature();
  const { hasPermission } = useAuth();

  return (
    <DetailShell title="Feature" error={error}>
      <PainelSearchShell
        actions={<Button onClick={() => void reload()}>Atualizar</Button>}
      >
        <TypeView
          mode="table"
          data={data}
          columns={columns}
          isLoading={loading}
        />
      </PainelSearchShell>
    </DetailShell>
  );
}
```

**Regras**:
- DetailShell = pagina principal com titulo e erro global.
- PainelSearchShell = secao com filtros e acoes.
- SideShell = formularios ou painel lateral.
- RelationShell = vinculos entre entidades.
- TypeView = visualizacao de dados (table ou grid).

### 3.4 Verificacao de Permissoes
Sempre usar `hasPermission()` antes de renderizar acoes:

```typescript
const { hasPermission, currentTenantId } = useAuth();

if (!hasPermission('feature.create')) {
  return <div>Sem permissao.</div>;
}

return <Button>Criar</Button>;
```

**Regras**:
- Verificar permissao em nivel de pagina (rota) e de acao (botao).
- Usar `currentTenantId` para bloquear acoes sem tenant selecionado.

### 3.5 Tipos de Feature
Defina tipos em `features/[feature]/types/`:

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

**Regras**:
- Separar `EntityData` (resposta) de `EntityPayload` (request).
- Tipos locais em `types/[feature].ts`.
- Tipos compartilhados em `types/api.ts` ou `types/async-state.ts`.

### 3.6 Constantes
Defina padroes em `features/[feature]/constants/`:

```typescript
export const ENTITY_INITIAL_VALUES: EntityPayload = { name: '' };

export const ENTITY_STATUS_OPTIONS = [
  { label: 'Ativo', value: 'ACTIVE' },
  { label: 'Inativo', value: 'INACTIVE' },
];
```

**Regras**:
- Usar SCREAMING_SNAKE_CASE para constantes.
- Manter valores iniciais para forms.
- Centralizar mapeamentos de opcoes.

## 4. Checklist para Nova Feature

- [ ] Arquivo de tipos em `features/[feature]/types/index.ts`
- [ ] Arquivo de constantes em `features/[feature]/constants/index.ts`
- [ ] Servicos de API em `features/[feature]/services/`
- [ ] Hooks customizados em `features/[feature]/hooks/` com pattern de `loading`, `saving`, `error`, `reload`
- [ ] Componentes em `features/[feature]/components/`
- [ ] Pagina roteada em `app/main/[feature]/page.tsx` usando DetailShell/TypeView
- [ ] Validacao de permissoes em componentes
- [ ] Build sem erro de tipagem
- [ ] Smoke visual: desktop, tablet, mobile

## 5. Prompt para Agente: Nova Feature

```
Voce e um agente de codigo frontend.
Implemente uma nova feature seguindo os padroes do projeto.

Feature: [nome]
Permissoes: [lista de permissoes necessarias]
Endpoints: [rotas de API]

Regras:
1. Criar servicos usando lib/api-client.ts
2. Implementar hook com loading, saving, error, reload
3. Componentes usam DetailShell, TypeView, SideShell
4. Validar permissoes com useAuth().hasPermission()
5. Tenant-aware: passar currentTenantId em servicos
6. Build sem erro de tipagem

Resultado esperado:
- Arquivo de feature funcional e roteado
- Composicao arquitetural consistente
- Permissoes validadas
```

## 6. Validacao de PR

Antes de mergear uma PR, validar:

- [ ] Tipos definidos e coerentes
- [ ] Hooks retornam `loading`, `saving`, `error`, `reload`
- [ ] Componentes usam shells padrao
- [ ] Permissoes verificadas em acoes
- [ ] Tenant passado em servicos
- [ ] Build sem erro
- [ ] Smoke visual (desktop, mobile)

## 7. Referencia Rapida

| Arquivo | Responsabilidade |
|---------|------------------|
| `types/` | Interfaces de dados |
| `constants/` | Valores padroes e mapeamentos |
| `services/` | Chamadas de API via `apiRequest` |
| `hooks/` | Logica de estado e dados |
| `components/` | Componentes React |
| `app/main/[feature]/page.tsx` | Pagina roteada |

## 8. Exemplos Completos

Veja modulos existentes:
- **Users**: CRUD simples, formulario, listagem
- **Roles**: Relacoes (Role-User, Role-Permission)
- **Tenants**: Contexto de tenant, listagem com selectbox
- **Audit**: Dados somente-leitura, visualizacao

---

**Duvidas?** Revise:
- `frontend/README.md` para setup e smoke
- `plan/Plan_Fase2_Hardening_UX.md` para criterios visuais
- `features/_template/README.md` para template de feature
