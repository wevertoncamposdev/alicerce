# TypeView & DetailView — Estruturação Definitiva via `/config` Plugável

> Estado analisado: commit atual da `main` pós-limpeza com `knip`. `DetailLayout` (slots `main/side/bottom`) já existe e funciona. Faltam: (1) `listLayout` simétrico para o `TypeView`, (2) mover `contextItems`/`auditItems`/autosave/topbar para dentro do contrato, (3) dois componentes de composição (`TypeViewScreen`/`DetailViewScreen`) que a page só invoca.

**Meta concreta:** `favorites/page.tsx` e `favorites/[id]/page.tsx` devem cair de ~50-70 linhas para ~10, e tudo que hoje está "na mão" na page deve migrar para `modules/favorites/config/contract.tsx`.

---

## 1. Diagnóstico específico: onde a page ainda sabe demais

### `favorites/page.tsx` hoje sabe

- Resolver `view`/`mode` a partir de `searchParams` (regra genérica, não é de `favorites`)
- Chamar `dataProvider.search` diretamente (deveria vir do contrato)
- Montar `AppTopbar` com `RecordSearch` + `ViewSwitcher` (é sempre a mesma composição para qualquer módulo)
- Montar manualmente **cada uma** das views (`listView`, `graphView`, `cardsView`, `formView`) passando componentes específicos de `favorites`

### `favorites/[id]/page.tsx` hoje sabe

- Chamar `dataProvider.read` e `getEntityAuditTrail` diretamente
- Montar `contextItems` fazendo mapeamento manual dos campos de `FavoriteEntity` (`user.email`, `tenant.legalName`) — **isso é conhecimento de domínio do módulo `favorites`, vazando pra page**
- Mapear `auditTrail` para `AuditFeedItem[]`
- Montar `AutoSaveStatusProvider` + `AppTopbar` + `AutoSaveIndicator` na mão

Nenhuma dessas responsabilidades deveria estar na page. A page deve responder só "qual módulo, qual id/searchParams" — o resto é `screens/` + `contract.tsx`.

---

## 2. Extensão do contrato (`lib/registry/types.ts`)

Dois blocos novos, aditivos — não quebra `favorites` existente até você migrar.

```ts
// lib/registry/types.ts
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { ContextItem, AuditFeedItem } from "@/components/DetailView/MetaDataView/types";
import type React from "react";

export type RecordModuleDataHandlers<T> = {
    search: (args: SearchArgs) => Promise<SearchResult<T>>;
    read: (id: string) => Promise<T>;
    create?: (payload: unknown) => Promise<T>;   // opcional: módulos read-only (ex: audit) não implementam
    update?: (id: string, payload: unknown) => Promise<T>;
    delete?: (id: string) => Promise<void>;
};

export type FormFieldConfig<T> = {
    name: keyof T & string;
    label: string;
    placeholder?: string;
    type: "text" | "url" | "textarea";
    required?: boolean;
};

export type DetailContext<T> = {
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
};

export type DetailLayout<T> = {
    main: (ctx: DetailContext<T>) => React.ReactNode;
    side?: (ctx: DetailContext<T>) => React.ReactNode;
    bottom?: (ctx: DetailContext<T>) => React.ReactNode;
};

// ============================================================
// NOVO — simétrico ao DetailLayout, mas para a tela de listagem
// ============================================================

export type ListContext<T> = {
    data: T[];
    searchArgs: SearchArgs;
};

/**
 * Cada chave é uma "view" (list, cards, graph, ...) e o valor é uma função
 * pura (ctx) => JSX. O módulo só declara as views que efetivamente suporta;
 * TypeViewScreen usa `views` (a lista de chaves) pra saber quais existem.
 */
export type ListLayout<T> = Partial<Record<string, (ctx: ListContext<T>) => React.ReactNode>>;

// ============================================================
// NOVO — o que hoje é montado na mão em favorites/[id]/page.tsx
// ============================================================

export type DetailConfig<T> = {
    /** Se true, DetailViewScreen busca a trilha de auditoria automaticamente. */
    auditEnabled?: boolean;
    /**
     * Constrói os ContextItem[] a partir do record já carregado.
     * Isso é conhecimento de domínio do módulo — não pertence à page.
     */
    loadContext?: (record: T) => ContextItem[] | Promise<ContextItem[]>;
};

export type RecordModuleDefinition<T = unknown> = {
    model: string;
    label: string;
    views: string[];
    defaultView: string;
    dataHandlers: RecordModuleDataHandlers<T>;
    formFields: FormFieldConfig<T>[];
    parseListState: (searchParams: Record<string, string | string[] | undefined>) => SearchArgs;
    serializeListState: (current: URLSearchParams, patch: Record<string, unknown>) => URLSearchParams;

    /** Slots da tela de listagem — plugado no TypeViewScreen. */
    listLayout: ListLayout<T>;

    /** Slots da tela de detalhe — plugado no DetailViewScreen. */
    detailLayout?: DetailLayout<T>;

    /** Comportamento de borda da tela de detalhe (audit, context). */
    detailConfig?: DetailConfig<T>;
};
```

**Por que `listLayout` é `Partial<Record<string, fn>>` e não um objeto fixo (`listView`/`cardsView`/...)**: assim o módulo pode adicionar `calendar`/`timeline`/`graph`/o-que-for sem alterar o tipo do contrato. `TypeView` deixa de saber a lista de views possíveis — ele só sabe pedir `layout[mode]`.

---

## 3. `TypeView` — vira "burro de propósito" (só resolve o slot)

Hoje `TypeView` recebe 4 props fixas (`listView`, `cardsView`, `graphView`, `formView`) — isso é o que te obriga a montar tudo na page. Novo formato: recebe o `layout` inteiro e o `mode`, e só escolhe.

```tsx
// components/TypeView/TypeView.tsx
import type { ListLayout, ListContext } from "@lib/registry/types";

export type TypeViewMode = string;

export function TypeView<T>({
    layout,
    mode,
    context,
}: {
    layout: ListLayout<T>;
    mode: TypeViewMode;
    context: ListContext<T>;
}) {
    const render = layout[mode];

    if (!render) {
        throw new Error(
            `View "${mode}" não está definida no listLayout deste módulo. ` +
            `Views disponíveis: ${Object.keys(layout).join(", ")}`
        );
    }

    return <>{render(context)}</>;
}
```

`TextView` sai do componente `TypeView` — se algum módulo quiser uma view de texto, ele declara `text: (ctx) => <TextView data={ctx.data} />` no próprio `listLayout`. `TypeView` não conhece mais nenhuma view concreta, só o mecanismo de slot.

---

## 4. `TypeViewScreen` — a composição genérica que a page chama

```tsx
// screens/TypeViewScreen.tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { AppTopbar } from "@/components/Layout/AppTopbar";
import { RecordListHost } from "@/components/Layout/RecordListHost";
import { RecordSearch } from "@/components/Layout/RecordSearch";
import { TypeView, type TypeViewMode } from "@/components/TypeView/TypeView";
import { ViewSwitcher } from "@/components/TypeView/ViewSwitcher";

type TypeViewScreenProps = {
    moduleName: string;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function TypeViewScreen({ moduleName, searchParams }: TypeViewScreenProps) {
    const rawParams = await searchParams;
    const mod = getModule(moduleName);

    const view = typeof rawParams.view === "string" ? rawParams.view : mod.defaultView;
    const mode: TypeViewMode = mod.views.includes(view) ? view : mod.defaultView;

    const args = mod.parseListState(rawParams);
    const dataProvider = createDataProvider();
    const result = await dataProvider.search(moduleName, args);

    return (
        <div>
            <AppTopbar
                title={mod.label}
                center={<RecordSearch searchText={args.searchText} />}
                actions={<ViewSwitcher current={mode} views={mod.views} />}
            />
            <div className="px-4 py-2">
                <RecordListHost>
                    <TypeView
                        layout={mod.listLayout}
                        mode={mode}
                        context={{ data: result.data, searchArgs: args }}
                    />
                </RecordListHost>
            </div>
        </div>
    );
}
```

Note que `ViewSwitcher` passa a receber `views={mod.views}` em vez de ter a lista de ícones fixa e hardcoded (seção 6 cobre isso).

**A page de `favorites` vira:**

```tsx
// app/(app)/favorites/page.tsx
import { TypeViewScreen } from "@/screens/TypeViewScreen";

export default function FavoritesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="favorites" searchParams={searchParams} />;
}
```

Isso é literalmente igual para `tenants`, `users`, `roles`, `permissions`, `audit` — só troca `moduleName`.

---

## 5. `DetailViewScreen` — fecha a borda que o `detailLayout` deixou de fora

```tsx
// screens/DetailViewScreen.tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { getEntityAuditTrail } from "@lib/data-provider/rest/audit";
import { DetailView } from "@/components/DetailView/DetailView";
import { AppTopbar } from "@/components/Layout/AppTopbar";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@/components/Layout/AutoSaveIndicator";
import type { AuditFeedItem, ContextItem } from "@/components/DetailView/MetaDataView/types";

export async function DetailViewScreen({ moduleName, id }: { moduleName: string; id: string }) {
    const mod = getModule(moduleName);
    const dataProvider = createDataProvider();

    const record = await dataProvider.read(moduleName, id);

    const [contextItems, auditItems] = await Promise.all([
        resolveContextItems(mod, record),
        resolveAuditItems(mod, moduleName, id),
    ]);

    return (
        <AutoSaveStatusProvider>
            <AppTopbar title={mod.label} autosave={<AutoSaveIndicator />} />
            <div className="px-4 py-2">
                <DetailView
                    moduleDefinition={mod}
                    record={record}
                    contextItems={contextItems}
                    auditItems={auditItems}
                    title={mod.label}
                />
            </div>
        </AutoSaveStatusProvider>
    );
}

async function resolveContextItems(mod: ReturnType<typeof getModule>, record: unknown): Promise<ContextItem[]> {
    if (!mod.detailConfig?.loadContext) return [];
    return mod.detailConfig.loadContext(record);
}

async function resolveAuditItems(
    mod: ReturnType<typeof getModule>,
    moduleName: string,
    id: string,
): Promise<AuditFeedItem[]> {
    if (!mod.detailConfig?.auditEnabled) return [];

    const trail = await getEntityAuditTrail(moduleName, id);

    return trail.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        userEmail: entry.user.email,
        tenantName: entry.tenant.legalName,
        summary: entry.after ? `Antes: ${entry.before ?? "—"} | Depois: ${entry.after}` : "—",
    }));
}
```

**A page de detalhe vira:**

```tsx
// app/(app)/favorites/[id]/page.tsx
import { DetailViewScreen } from "@/screens/DetailViewScreen";

export default async function FavoriteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="favorites" id={id} />;
}
```

---

## 6. `ViewSwitcher` — parar de hardcodar os 5 ícones fixos

Hoje `VIEW_OPTIONS` é uma lista fixa com `form/list/cards/graph/text` sempre, mesmo que o módulo só suporte 2. Ajuste: receber `views: string[]` e mapear pra um ícone via dicionário com fallback, e só renderizar o que o módulo de fato tem.

```tsx
// components/TypeView/ViewSwitcher.tsx
"use client";

import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group";
import { LayoutGrid, LayoutList, LineChart, FileText, FormInput, Calendar, ListTree, LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TypeViewMode } from "@/components/TypeView/TypeView";

const ICON_BY_VIEW: Record<string, LucideIcon> = {
    form: FormInput,
    list: LayoutList,
    cards: LayoutGrid,
    graph: LineChart,
    text: FileText,
    calendar: Calendar,
    timeline: ListTree,
};

export function ViewSwitcher({ current, views }: { current: TypeViewMode; views: string[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function handleChange(next: string) {
        const params = new URLSearchParams(searchParams);
        params.set("view", next);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <ToggleGroup type="single" value={current} onValueChange={(v) => v && handleChange(v)}>
            {views.map((view) => {
                const Icon = ICON_BY_VIEW[view] ?? LayoutList;
                return (
                    <ToggleGroupItem key={view} value={view} aria-label={view}>
                        <Icon className="h-4 w-4" />
                    </ToggleGroupItem>
                );
            })}
        </ToggleGroup>
    );
}
```

Novas views (`calendar`, `timeline`) só precisam de uma entrada no dicionário de ícones — o resto (roteamento, estado ativo) já funciona.

---

## 7. `contract.tsx` de `favorites` reescrito com tudo plugado

Isso é o "antes/depois" que prova a extração: tudo que estava na page migra pra cá.

```tsx
// modules/favorites/config/contract.tsx
import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout, ListLayout } from "@lib/registry/types";
import {
    searchFavorites, readFavorite, createFavorite, updateFavorite, deleteFavorite,
} from "./provider";
import {
    parseFavoritesListState, serializeFavoritesListState,
} from "@lib/query-state/favorites-query-state";
import type { FavoriteEntity } from "@/modules/favorites/types/types";

import { FormView } from "@/components/TypeView/FormView/FormView";
import { CardsView } from "@/components/TypeView/CardsView/CardsView";
import { MetaDataShell } from "@/components/DetailView/MetaDataView";
import { MetaDataSidebar } from "@/components/DetailView/MetaDataView/MetaDataSidebar";
import { RelationTablePanel } from "@/components/DetailView/RelationView/RelationTablePanel";
import { FavoritesGraphView } from "@modules/favorites/components/FavoritesGraphView";
import { FavoritesListView } from "@modules/favorites/components/FavoritesListView";
import { listFavoriteNotes } from "./notes-provider";
import type { ContextItem } from "@/components/DetailView/MetaDataView/types";

const formFields = [
    { name: "title" as const, label: "Título", placeholder: "Digite o título", type: "text" as const, required: true },
    { name: "url" as const, label: "URL", placeholder: "Digite a URL", type: "url" as const, required: true },
];

// ------------------------------------------------------------
// Listagem — antes montado na page, agora 100% do módulo
// ------------------------------------------------------------
const favoritesListLayout: ListLayout<FavoriteEntity> = {
    list: ({ data }) => <FavoritesListView data={data} />,
    graph: ({ data }) => <FavoritesGraphView data={data} />,
    cards: ({ data }) => <CardsView data={data} detail="/favorites" />,
    form: () => (
        <FormView<FavoriteEntity>
            mode="create"
            fields={formFields}
            createAction={createFavorite}
        />
    ),
};

// ------------------------------------------------------------
// Detalhe — igual já estava, mantido
// ------------------------------------------------------------
const favoritesDetailLayout: DetailLayout<FavoriteEntity> = {
    main: ({ record }) => (
        <FormView<FavoriteEntity>
            mode="edit"
            model="favorites"
            recordId={record.id}
            fields={formFields}
            initialValues={record}
        />
    ),
    side: ({ contextItems, auditItems }) => (
        <MetaDataSidebar>
            <MetaDataShell contextItems={contextItems} auditItems={auditItems} />
        </MetaDataSidebar>
    ),
    bottom: ({ record }) => <FavoritesNotesSection favoriteId={record.id} />,
};

// ------------------------------------------------------------
// NOVO — antes era montado à mão em favorites/[id]/page.tsx
// ------------------------------------------------------------
function loadFavoriteContext(record: FavoriteEntity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt.slice(0, 16).replace("T", ", ") },
        { key: "userId", label: "Usuário", value: record.user.email ?? "—" },
        { key: "tenantId", label: "Tenant", value: record.tenant.legalName ?? "—" },
    ];
}

export const favoritesModule = defineRecordModule<FavoriteEntity>({
    model: "favorites",
    label: "Favoritos",
    views: ["list", "cards", "graph", "form"],
    defaultView: "list",
    dataHandlers: { search: searchFavorites, read: readFavorite, create: createFavorite, update: updateFavorite, delete: deleteFavorite },
    formFields,
    parseListState: parseFavoritesListState,
    serializeListState: serializeFavoritesListState,
    listLayout: favoritesListLayout,
    detailLayout: favoritesDetailLayout,
    detailConfig: {
        auditEnabled: true,
        loadContext: loadFavoriteContext,
    },
});

registerModule(favoritesModule);

async function FavoritesNotesSection({ favoriteId }: { favoriteId: string }) {
    const notes = await listFavoriteNotes(favoriteId);
    return (
        <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Notas</h2>
            <RelationTablePanel favoriteId={favoriteId} initialNotes={notes} />
        </div>
    );
}
```

**Ponto-chave:** removi a view `"text"` do `views` porque `TextView` não estava conectada a nenhum dado de domínio real (era genérica). Se quiser manter, é só adicionar `text: ({ data }) => <TextView data={data} />` no `listLayout` e `"text"` de volta em `views`.

---

## 8. O que isso destrava para os módulos novos (tenants, users, roles, permissions, audit)

Com essa estrutura pronta, criar `roles` por exemplo é **só isso**:

```tsx
// modules/roles/config/contract.tsx
export const rolesModule = defineRecordModule<RoleEntity>({
    model: "roles",
    label: "Papéis",
    views: ["list", "cards"],
    defaultView: "list",
    dataHandlers: { search: searchRoles, read: readRole, create: createRole, update: updateRole, delete: deleteRole },
    formFields: roleFormFields,
    parseListState: createListQueryState().parseListState,   // ver seção 9
    serializeListState: createListQueryState().serializeListState,
    listLayout: {
        list: ({ data }) => <RolesListView data={data} />,
        cards: ({ data }) => <CardsView data={data} detail="/roles" />,
    },
    detailLayout: {
        main: ({ record }) => <FormView mode="edit" model="roles" recordId={record.id} fields={roleFormFields} initialValues={record} />,
    },
    detailConfig: {
        auditEnabled: true,
        loadContext: (record) => [
            { key: "tenantId", label: "Tenant", value: record.tenant.legalName ?? "—" },
        ],
    },
});

registerModule(rolesModule);
```

```tsx
// app/(app)/roles/page.tsx
export default function RolesPage({ searchParams }) {
    return <TypeViewScreen moduleName="roles" searchParams={searchParams} />;
}

// app/(app)/roles/[id]/page.tsx
export default async function RoleDetailPage({ params }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="roles" id={id} />;
}
```

Zero lógica de composição nas pages — 100% delegado ao contrato.

Caso especial `audit` (somente leitura): como `create/update/delete` agora são opcionais em `RecordModuleDataHandlers<T>` (seção 2), o contrato de `audit` simplesmente não os declara, e não precisa de `[id]/page.tsx` se não houver tela de detalhe (ou pode ter uma sem `FormView`, só com `MetaDataView` mostrando o registro).

---

## 9. Query-state genérico (para não reescrever parse/serialize em cada módulo)

`favorites-query-state.ts` é hoje 100% específico, mas a lógica é idêntica em qualquer módulo. Extrair fábrica:

```ts
// lib/query-state/list-query-state.ts
import type { SearchArgs } from "@lib/data-provider/types";

const DEFAULT_PAGE_SIZE = 20;

export function createListQueryState(options?: { pageSize?: number }) {
    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

    function parseListState(searchParams: Record<string, string | string[] | undefined>): SearchArgs {
        const searchText = typeof searchParams.q === "string" ? searchParams.q : undefined;
        const pageParam = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
        const pageIndex = Number.isFinite(pageParam) && pageParam > 0 ? pageParam - 1 : 0;
        const sortField = typeof searchParams.sortField === "string" ? searchParams.sortField : undefined;
        const sortDirection =
            searchParams.sortDirection === "asc" || searchParams.sortDirection === "desc"
                ? searchParams.sortDirection
                : undefined;

        return {
            searchText,
            pagination: { pageIndex, pageSize },
            sort: sortField ? [{ field: sortField, direction: sortDirection ?? "asc" }] : undefined,
        };
    }

    function serializeListState(
        current: URLSearchParams,
        patch: Partial<{ searchText: string; pageIndex: number; sortField: string; sortDirection: "asc" | "desc" }>,
    ): URLSearchParams {
        const params = new URLSearchParams(current);

        if ("searchText" in patch) {
            if (patch.searchText) params.set("q", patch.searchText); else params.delete("q");
            params.delete("page");
        }
        if ("pageIndex" in patch && patch.pageIndex !== undefined) {
            if (patch.pageIndex > 0) params.set("page", String(patch.pageIndex + 1)); else params.delete("page");
        }
        if ("sortField" in patch) {
            if (patch.sortField) {
                params.set("sortField", patch.sortField);
                params.set("sortDirection", patch.sortDirection ?? "asc");
            } else {
                params.delete("sortField");
                params.delete("sortDirection");
            }
        }

        return params;
    }

    return { parseListState, serializeListState };
}
```

`favorites-query-state.ts` pode virar um one-liner (ou ser removido e o contrato chamar `createListQueryState()` direto, como no exemplo de `roles` acima).

---

## 10. Checklist de migração (ordem segura, sem quebrar `favorites`)

1. Adicionar `listLayout`, `DetailConfig`, `ListLayout`, `ListContext` em `lib/registry/types.ts` (aditivo — nada quebra ainda).
2. Reescrever `TypeView.tsx` para o formato `layout`/`mode`/`context`.
3. Atualizar `ViewSwitcher` para receber `views: string[]`.
4. Criar `screens/TypeViewScreen.tsx` e `screens/DetailViewScreen.tsx`.
5. Atualizar `modules/favorites/config/contract.tsx` com `listLayout` + `detailConfig.loadContext`/`auditEnabled`.
6. Simplificar `favorites/page.tsx` e `favorites/[id]/page.tsx` para chamar os screens.
7. Rodar a aplicação e validar manualmente: listagem (todas as views), criação via `form`, edição via detalhe, notas (relation), audit trail, context panel — todos devem renderizar exatamente igual a antes.
8. Extrair `createListQueryState` (seção 9) e migrar `favorites` para usá-la.
9. Só depois disso, seguir para os módulos novos (`tenants`, `users`, `roles`, `permissions`, `audit`), cada um já nascendo no formato final da seção 8 — sem precisar tocar de novo em `TypeView`/`DetailView`.

**Critério de pronto:** qualquer módulo novo só precisa de um arquivo `config/contract.tsx` + duas pages de ~5 linhas cada. Se em algum módulo novo você perceber que precisa "abrir" o `TypeViewScreen` ou `DetailViewScreen` para fazer algo específico, é sinal de que falta um slot no contrato — a correção é sempre adicionar campo ao contrato, nunca lógica condicional dentro do screen genérico.

Quer que eu aplique essas mudanças diretamente no repositório (clonado localmente), fase a fase, começando pelo `lib/registry/types.ts`?
