# Plano de Refatoração e Padronização — `study` (v2, por fases)

> Re-análise feita em cima do commit atual da `main` (`ad7bf13`), comparado com `TerceiroGestor/system_development`.

---

## 0. O que mudou desde a última análise (progresso real, não é diagnóstico repetido)

Antes de propor qualquer coisa nova, o que já foi implementado corretamente e **não precisa ser refeito**:

- ✅ Os órfãos de fases antigas (`components/layout/TypeView.tsx`, `ViewSwitcher.tsx`, `DataTable.tsx`, `List.tsx`, `SimpleForm.tsx`) **sumiram**. Limpeza já feita.
- ✅ Você já implementou o **`DetailShellEngine`** (`components/Shells/DetailShellEngine.tsx`) seguindo exatamente o padrão do `TerceiroGestor`: o contrato do módulo (`RecordModuleDefinition`) ganhou um campo `detailLayout` com slots `main`/`side`/`bottom`, cada um uma função pura `(ctx) => ReactNode`. Isso é o `DetailView` que discutimos — só falta o nome (seção 2.3) e mover a montagem de `contextItems`/`auditItems` para dentro do fluxo (seção 2.4).
- ✅ `modules/favorites/config/contract.tsx` já usa `detailLayout` para declarar `FormView` (main), `MetaDataShell` (side) e a seção de notas (bottom) — a lógica de composição saiu da page e foi para o contrato do módulo. Exatamente a direção certa.

O que **ainda não avançou** (bugs antigos ainda presentes + gaps novos):

- ✅ O bug de case `Shells`/`shells` **continua no ar** — `components/Shells/index.ts` e todo import no projeto seguem apontando para `@/components/shells` (minúsculo) enquanto a pasta real é `Shells`. Ainda vai quebrar em build Linux.
- ✅ `PainelSearchShell/filters.ts` continua sem exportar `FilterSchema`/`favoriteFilters`, e `PainelSearchShell`/`DynamicFilter` continuam **não usados em lugar nenhum** — nem em `favorites`, nem nos módulos legados.
- ❌ `favorites/[id]/page.tsx` ainda monta `contextItems`/`auditItems` manualmente na page antes de passar pro `DetailShellEngine`, e ainda importa `AutoSaveStatusProvider`/`AppTopbar`/`AutoSaveIndicator` direto — o ganho do `detailLayout` foi só parcial: resolveu o **conteúdo** dos slots, mas não a **borda** (auditoria, contexto, provider de autosave).
- 🆕 Apareceu `features/_template/` — um scaffold para criar novas features **no padrão antigo** (`hooks/`, `services/`, `components/`, `constants/`, sem `defineRecordModule`). Isso é um risco: se `tenants`/`users`/etc. forem criados a partir desse template, eles nascem já fora do padrão `modules/*` que queremos consolidar. Precisa ser substituído por um template baseado no padrão de `favorites` antes de qualquer módulo novo ser criado.
- 🆕 `features/{audit,auth,permissions,roles,users}` continuam 100% no padrão antigo — nenhum migrou para `modules/*` ainda, e as pages `permissions/page.tsx` (103 linhas), `users/page.tsx` (122), `roles/page.tsx` (136), `audit/page.tsx` (47), `dashboard/page.tsx` (66) foram escritas na mão, sem reaproveitar `TypeView`/`RecordListHost`.

Isso muda a ordem de prioridade do plano: como o `detailLayout` já existe e funciona, dá pra migrar os módulos novos **em paralelo** à finalização do `DetailView`, em vez de bloquear tudo nele. O plano abaixo reflete isso.

---

## FASE 1 — Correções críticas (sem mudança de arquitetura, risco baixo)

Objetivo: parar de acumular dívida em cima de bugs conhecidos antes de escalar para 6 módulos novos.

1.1. **Corrigir o case `Shells` → `shells`**

```bash
git mv frontend/src/components/Shells frontend/src/components/shells-tmp
git mv frontend/src/components/shells-tmp frontend/src/components/shells
```

Confirmar que nenhum import quebrou (`grep -r "components/Shells"` deve retornar vazio — hoje todos já usam minúsculo, só a pasta física está errada).

1.2. **Corrigir `PainelSearchShell/filters.ts`**

```ts
export type FilterSchema = { key: string; label: string; type: "select" | "text" | "date"; options?: string[] };
export const favoriteFilters: FilterSchema[] = [ /* ... */ ];
```

E em `DynamicFilter.tsx`, importar o tipo: `import type { FilterSchema } from "./filters";`.

1.3. **Decisão sobre `PainelSearchShell`/`DynamicFilter`**: hoje é código morto (não referenciado por nada). Duas opções — escolher uma na Fase 1 em vez de deixar ambíguo:

- (a) Deletar até ter um caso de uso real, ou
- (b) Conectar de verdade em `favorites` como prova de conceito, via `searchConfig.filters` no contrato (ver Fase 3).
   Recomendo (b), porque filtro dinâmico por módulo é algo que os 6 módulos novos vão precisar (ex: `roles` filtrado por `tenant`, `audit` filtrado por `action`).

1.4. **Substituir `features/_template` por `modules/_template`**, gerado a partir da estrutura real de `modules/favorites` (config/contract, config/provider, components, types, actions), para que qualquer scaffold futuro já nasça no padrão certo. Sem isso, a Fase 4 corre o risco de ser feita "errada" se alguém usar o template antigo.

**Critério de saída da Fase 1**: `favorites` continua funcionando 100% igual (regressão zero), os dois bugs de PainelSearch estão resolvidos, e existe um template correto para os módulos novos.

---

## FASE 2 — Consolidar o fluxo `TypeView` → `DetailView`

Objetivo: fechar o padrão de composição genérica das duas telas, para que a Fase 4 (6 módulos novos) seja só "preencher contrato", não "escrever página".

### 2.1. `TypeViewScreen` — extrair o que hoje está hardcoded em `favorites/page.tsx`

`favorites/page.tsx` hoje faz, manualmente: ler `searchParams`, resolver `view`/`mode`, chamar `getModule`, montar `dataProvider.search`, montar `AppTopbar` com `RecordSearch`+`ViewSwitcher`, montar `RecordListHost > TypeView`. Extrair para:

```
screens/type-view-screen/TypeViewScreen.tsx
```

recebendo `moduleName` + um mapa `views` com só o que é específico de cada módulo (as views de `list`/`cards`/`graph` já feitas). Isso é reaproveitado por **todos** os módulos da Fase 4.

### 2.2. `DetailViewScreen` — fechar o que o `detailLayout` deixou de fora

O `detailLayout` resolveu o **conteúdo**. Falta resolver a **borda** que ainda está na page:

```tsx
// hoje, em favorites/[id]/page.tsx (repetido em toda page de detalhe futura)
<AutoSaveStatusProvider>
  <AppTopbar title={...} autosave={<AutoSaveIndicator />} />
  <DetailShellEngine moduleDefinition={...} record={...} contextItems={...} auditItems={...} title={...} />
</AutoSaveStatusProvider>
```

Proposta: mover `contextItems`/`auditItems` para dentro do contrato do módulo (`detailConfig.loadContext`, `detailConfig.auditEnabled` — igual ao plano anterior) e criar:

```
screens/detail-view-screen/DetailViewScreen.tsx
```

que já embrulha `AutoSaveStatusProvider` + `AppTopbar` + `DetailShellEngine`. A page de detalhe de qualquer módulo fica:

```tsx
export default async function FavoriteDetailPage({ params }) {
  const { id } = await params;
  return <DetailViewScreen moduleName="favorites" id={id} />;
}
```

### 2.3. Renomear para a nomenclatura definitiva

Agora que o engine já existe e funciona, fechar o nome (seu termo, simétrico a `TypeView`):

| Nome atual | Nome final |
|---|---|
| `components/Shells/DetailShellEngine.tsx` | `components/detail-view/DetailView.tsx` |
| `components/Shells/DetailShell.tsx` (o "casco" visual) | `components/detail-view/DetailShell.tsx` (mantém, é peça interna) |
| `components/Shells/MetaDataShell/*` | `components/detail-view/MetaDataView/*` |
| `components/Shells/RelationShell/*` | `components/detail-view/RelationView/*` |
| `components/Shells/PainelSearchShell/*` | `components/detail-view/search-panel/*` (ou `components/type-view/search-panel`, ver 2.1 — decidir se busca é do `TypeView` ou do `DetailView`; hoje ela é da listagem, então deveria migrar para perto do `TypeView`) |

**Critério de saída da Fase 2**: `favorites/page.tsx` e `favorites/[id]/page.tsx` viram cada um ~10 linhas, delegando tudo para `TypeViewScreen`/`DetailViewScreen`. Esse é o teste real de que a abstração está completa — se ainda sobrar lógica de composição na page, a Fase 2 não terminou.

---

## FASE 3 — Extensão do contrato (`RecordModuleDefinition`)

Objetivo: dar suporte, no contrato, a tudo que a Fase 2 passou a exigir dos módulos.

```ts
// lib/registry/types.ts — aditivo, não quebra favorites
export type RecordModuleDefinition<T = unknown> = {
  // ...campos atuais (model, label, views, dataHandlers, formFields, parseListState,
  //    serializeListState, detailLayout — já existe)...

  detailConfig?: {
    auditEnabled?: boolean;
    loadContext?: (record: T) => Promise<ContextItem[]> | ContextItem[];
  };

  searchConfig?: {
    filters?: FilterSchema[]; // plugado no search-panel (ex-PainelSearchShell)
  };
};
```

Também generalizar `lib/query-state/favorites-query-state.ts` (hoje 100% amarrado a `favorites`) para `lib/query-state/list-query-state.ts`, com uma fábrica `createListQueryState()` reaproveitável por qualquer módulo — a lógica de `page`/`sort`/`searchText` é idêntica em todos.

Ajuste pequeno em `RecordModuleDataHandlers<T>`: tornar `create`/`update`/`delete` opcionais, porque `audit` é módulo somente-leitura e não deveria ser forçado a implementar um CRUD falso.

**Critério de saída da Fase 3**: `favorites` migrado para `detailConfig`/`list-query-state.ts` genérico, sem perder nenhum comportamento — e o contrato pronto para os 6 módulos da Fase 4 sem precisar de mais mudanças de tipo.

---

## FASE 4 — Migrar os módulos para `modules/*` (tenants, users, permissions, roles, audit, dashboard)

Com as Fases 1–3 prontas, cada módulo segue o mesmo checklist (o que vira o tutorial do README, seção da Fase 6):

1. `modules/<nome>/types.ts` — entidade.
2. `modules/<nome>/config/provider.ts` — `search/read/create?/update?/delete?` via `apiServer`.
3. `modules/<nome>/config/contract.tsx` — `defineRecordModule` + `detailLayout` (se o módulo tiver tela de detalhe) + `searchConfig`/`detailConfig`.
4. Registrar em `lib/registry/bootstrap.ts`.
5. `app/(app)/<nome>/page.tsx` → `<TypeViewScreen moduleName="..." views={{...}} />`.
6. Se tiver detalhe: `app/(app)/<nome>/[id]/page.tsx` → `<DetailViewScreen moduleName="..." id={id} />`.
7. Migrar o que for útil de `features/<nome>/*` (hooks/services que não são `dataHandlers`) para `modules/<nome>/components/`; descartar o resto.

Ordem sugerida (por dependência de dados, não por dificuldade):

1. **`tenants`** — primeiro, porque `favorites` e outros já referenciam `tenant` no contexto; ter o módulo formalizado ajuda a validar `loadContext`.
2. **`users`** — mesmo motivo (referenciado no `contextItems` de `favorites` hoje).
3. **`roles`** e **`permissions`** — dependem de `tenants`/`users` existirem para relação.
4. **`audit`** — só leitura (`search`+`read`), bom caso de teste para `dataHandlers` parciais da Fase 3.
5. **`dashboard`** — tratado à parte na Fase 5, não é um `RecordModuleDefinition` (é agregação de widgets, não uma entidade com CRUD).

**Critério de saída da Fase 4**: as 5 pages (`tenants`, `users`, `roles`, `permissions`, `audit`) reduzidas ao mesmo tamanho de `favorites/page.tsx` pós-Fase 2 (~10 linhas cada), `features/*` correspondentes removidas.

---

## FASE 5 — `dashboard`

Não força o padrão `TypeView`/`DetailView` — é composição de widgets/gráficos agregados, não uma listagem de registros. Mover o conteúdo de `app/(app)/dashboard/page.tsx` para `modules/dashboard/components/*` (só para não ficar solto em `app/`), mas sem `defineRecordModule`. Definir nessa fase se cada widget busca dado via `apiServer` direto na page (Server Component) ou se há necessidade de um endpoint agregador no backend — isso é uma decisão de escopo, não uma dívida técnica herdada.

---

## FASE 6 — Documentação (`README.md`)

Com tudo implementado (não antes — o README deve documentar a API real, não a intenção), escrever:

1. Visão geral: `TypeView` → `DetailView`, por que cobre a maioria dos casos.
2. `apiServer` (Server Components) vs `api-client` + `/api/proxy` (Client Components) — diagrama e justificativa (isso já existe no código hoje, só falta explicar).
3. Contrato `RecordModuleDefinition` completo, campo a campo, com `favorites` como exemplo real.
4. `TypeViewScreen` e `DetailViewScreen` — como declarar views/slots custom.
5. **Tutorial "Como adicionar um novo módulo"** — o checklist de 7 passos da Fase 4, com código mínimo de cada um dos arquivos.
6. Convenções de pasta/nomenclatura (tabela da Fase 2.3).
7. Como estender `tests/*.spec.ts` para o módulo novo.

---

## Resumo — mapa de fases

| Fase | Entrega | Depende de |
|---|---|---|
| 1 | Bugs corrigidos (case, filters.ts) + template correto | — |
| 2 | `TypeViewScreen` + `DetailViewScreen` genéricos, `DetailView` renomeado | Fase 1 |
| 3 | Contrato estendido (`detailConfig`, `searchConfig`, query-state genérico) | Fase 2 |
| 4 | `tenants`, `users`, `roles`, `permissions`, `audit` migrados para `modules/*` | Fase 3 |
| 5 | `dashboard` reorganizado (sem forçar padrão de registro) | Fase 4 (paralelizável) |
| 6 | `README.md` completo + tutorial de novo módulo | Fases 1–5 concluídas |

Cada fase = uma branch/PR, testável isoladamente antes de avançar. Quer que eu comece já pela Fase 1 no repositório?
