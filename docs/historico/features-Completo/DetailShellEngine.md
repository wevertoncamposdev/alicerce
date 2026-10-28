# Fase 8 — DetailShellEngine (composição final)

Analisei o estado atual do `study` (branch main) e do `system_development` para ancorar esta fase na implementação real.

## O que existe hoje no seu `favorites/[id]/page.tsx`

Hoje a página de detalhe monta tudo manualmente: busca o módulo no registry, chama o `dataProvider`, monta `contextItems`/`auditItems` à mão, e faz o JSX empilhando `FormView` + `RelationTablePanel` + `MetaDataSidebar` na marra. Funciona, mas tem um problema estrutural: **cada novo módulo com tela de detalhe vai repetir esse wiring inteiro**. Nada disso é reaproveitável — é só um Server Component "artesanal".

É exatamente esse ponto de dor que o `DetailShellEngine` resolve no projeto de referência (`web-client/detail/DetailShellEngine.tsx`).

---

### 1. Conceito

O `DetailShellEngine` **não é mais um componente visual** — os componentes visuais (`FormView`, `MetaDataShell`, `RelationShell`) já existem desde as Fases 5–7. Ele é uma **camada de composição declarativa**: lê um `detailLayout` descrito dentro do `moduleDefinition` (o contrato que você criou na Fase 4 com `defineRecordModule`) e decide, em runtime, quais slots (`main`, `side`, `bottom`) preencher com o quê.

A ideia central: a página `page.tsx` deixa de saber *como* montar a tela de detalhe. Ela só sabe *qual módulo* e *qual id*. Quem sabe montar é o `detailLayout` dentro do contrato do módulo — o mesmo lugar onde hoje já vivem `formFields`, `dataHandlers` etc.

Isso fecha o ciclo da Fase 4: naquela fase você extraiu o "o quê" (dados, campos) para o contrato. Agora você extrai o "como compor visualmente" também para o contrato. O `DetailShellEngine` é só o motor que interpreta esse contrato.

### 2. Tecnologias envolvidas

- **TypeScript genérico** — `DetailShellEngine<T>` precisa ser tipado pelo tipo da entidade (`FavoriteEntity`), senão os slots perdem type-safety.
- **Composição via funções de renderização** (`(context) => ReactNode`), não via componentes fixos — é o padrão "render prop" aplicado a configuração declarativa, não a props de componente.
- **React Server Components** — igual às fases anteriores, o `DetailShellEngine` roda no servidor; só os filhos que precisam de interatividade (`FormView` com autosave, `RelationTablePanel`) são `"use client"`.

### 3. Decisões de design (com justificativa)

**Decisão 1 — simplificar o `detailLayout` do reference.**
O `DetailShellEngine` do `system_development` tem `tabs`, `tabTemplates`, `breadcrumbItems`, `headerActionsSlot`, `viewControlsSlot` — é o motor de um sistema com múltiplas telas de detalhe complexas (tickets, tarefas, etc.), amadurecido ao longo do tempo. Para o `study`, reproduzir tudo isso agora seria copiar complexidade sem copiar o motivo dela existir. Vou manter só os três slots que você já usa de verdade: `main` (form), `side` (metadata) e `bottom` (relations). Isso é fiel ao princípio "referência arquitetural, não cópia cega" que vimos guiando a Fase 4.

**Decisão 2 — o audit feed continua sendo buscado fora do engine.**
No reference, existe um hook `useDetailAuditFeed` que busca auditoria dentro do próprio engine (client-side). No seu projeto, a página já busca `auditTrail` via `apiServer` direto no Server Component (padrão fixado desde a Fase 3: SC chama `apiServer` diretamente, sem Route Handler). Não vou introduzir um hook client para isso — seria regredir a arquitetura que você já fixou. O `detailLayout` vai **receber** os dados prontos via `context`, não buscá-los.

**Decisão 3 — `context` como contrato de dados do slot.**
Cada função de slot (`main`, `side`, `bottom`) recebe um objeto `context` tipado (`{ record, auditItems, contextItems, notes }`). Isso é o mesmo princípio de inversão de dependência do `DataProvider` (Fase 1): o slot não sabe de onde os dados vêm, só recebe o que precisa.

---

### 4. Código completo — `favorites`

#### 4.1 Estender o contrato do módulo (`lib/registry/types.ts`)Agora sim, vamos ao código. Adicione ao `types.ts` do registry

```ts
// lib/registry/types.ts
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { ContextItem, AuditFeedItem } from "@components/shells/MetaDataShell/types";

// ... tipos existentes (RecordModuleDataHandlers, FormFieldConfig) permanecem iguais

/**
 * Contexto que o DetailShellEngine injeta em cada slot.
 * T = tipo da entidade do módulo (ex: FavoriteEntity)
 */
export type DetailContext<T> = {
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
};

/**
 * Cada slot é uma função pura: (contexto) => JSX.
 * Se o módulo não define um slot, o engine simplesmente não renderiza aquela área.
 */
export type DetailLayout<T> = {
    main: (ctx: DetailContext<T>) => React.ReactNode;
    side?: (ctx: DetailContext<T>) => React.ReactNode;
    bottom?: (ctx: DetailContext<T>) => React.ReactNode;
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
    /** Novo na Fase 8: descreve como montar a tela de detalhe deste módulo */
    detailLayout?: DetailLayout<T>;
};
```

Precisa importar `React` no arquivo (`import type React from "react"` no topo) já que `types.ts` hoje não referencia JSX.

#### 4.2 O `DetailShellEngine` (`components/Shells/DetailShellEngine.tsx`)

```tsx
// components/Shells/DetailShellEngine.tsx
import * as React from "react";
import type { RecordModuleDefinition, DetailContext } from "@lib/registry/types";
import type { ContextItem, AuditFeedItem } from "@components/shells/MetaDataShell/types";
import { DetailShell } from "@components/shells/DetailShell";

interface DetailShellEngineProps<T> {
    moduleDefinition: RecordModuleDefinition<T>;
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
    /** título e descrição visuais — o engine não inventa esses textos */
    title: string;
    description?: string;
    toolbar?: React.ReactNode;
}

/**
 * Motor de composição da tela de detalhe.
 * Não sabe renderizar formulário, metadata ou relations — só sabe
 * PERGUNTAR ao moduleDefinition.detailLayout o que colocar em cada slot,
 * e entregar esse resultado para o DetailShell (o "casco" visual da Fase 6/7).
 */
export function DetailShellEngine<T>({
    moduleDefinition,
    record,
    contextItems,
    auditItems,
    title,
    description,
    toolbar,
}: DetailShellEngineProps<T>) {
    const layout = moduleDefinition.detailLayout;

    if (!layout) {
        throw new Error(
            `Módulo "${moduleDefinition.model}" não define detailLayout. ` +
            `Adicione detailLayout ao contrato antes de usar DetailShellEngine.`
        );
    }

    const context: DetailContext<T> = { record, contextItems, auditItems };

    const mainSlot = layout.main(context);
    const sideSlot = layout.side?.(context) ?? null;
    const bottomSlot = layout.bottom?.(context) ?? null;

    return (
        <DetailShell title={title} description={description} toolbar={toolbar}>
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex-1 space-y-6">
                    {mainSlot}
                    {bottomSlot}
                </div>
                {sideSlot ? <div className="lg:w-80 lg:flex-shrink-0">{sideSlot}</div> : null}
            </div>
        </DetailShell>
    );
}
```

Note que `DetailShellEngine` **compõe** o `DetailShell` genérico que já existe (usado hoje em `users`, `roles`, `audit`, etc.) — não o substitui. Isso mantém consistência visual entre telas de detalhe "simples" (sem módulo) e telas orientadas a `moduleDefinition`.

#### 4.3 `detailLayout` de `favorites` (`modules/favorites/config/contract.ts`)

```ts
import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout } from "@lib/registry/types";
import {
    searchFavorites, readFavorite, createFavorite, updateFavorite, deleteFavorite,
} from "./provider";
import {
    parseFavoritesListState, serializeFavoritesListState,
} from "@lib/query-state/favorites-query-state";
import type { Favorite, FavoriteEntity } from "@modules/favorites/types";

import { FormView } from "@components/type-view/form-view/FormView";
import { MetaDataShell } from "@components/shells/MetaDataShell";
import { MetaDataSidebar } from "@components/shells/MetaDataShell/MetaDataSidebar";
import { RelationTablePanel } from "@components/shells/RelationShell/RelationTablePanel";
import { listFavoriteNotes } from "./notes-provider";

const favoritesDetailLayout: DetailLayout<FavoriteEntity> = {
    main: ({ record }) => (
        <FormView<FavoriteEntity>
            mode="edit"
            model="favorites"
            recordId={record.id}
            fields={favoritesModule.formFields}
            initialValues={record}
        />
    ),
    side: ({ contextItems, auditItems }) => (
        <MetaDataSidebar>
            <MetaDataShell contextItems={contextItems} auditItems={auditItems} />
        </MetaDataSidebar>
    ),
    // bottom usa render assíncrono pré-resolvido — ver observação abaixo
    bottom: ({ record }) => <FavoritesNotesSection favoriteId={record.id} />,
};

export const favoritesModule = defineRecordModule<Favorite>({
    model: "favorites",
    label: "Favoritos",
    views: ["list", "cards", "graph", "text", "form"],
    defaultView: "list",
    dataHandlers: { search: searchFavorites, read: readFavorite, create: createFavorite, update: updateFavorite, delete: deleteFavorite },
    formFields: [
        { name: "title", label: "Título", placeholder: "Digite o título", type: "text", required: true },
        { name: "url", label: "URL", placeholder: "Digite a URL", type: "url", required: true },
    ],
    parseListState: parseFavoritesListState,
    serializeListState: serializeFavoritesListState,
    detailLayout: favoritesDetailLayout,
});

registerModule(favoritesModule);

// Componente auxiliar Server Component que busca notes por dentro do slot
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

**Observação importante de design:** o slot `bottom` é um Server Component assíncrono (`FavoritesNotesSection`), não uma função síncrona que recebe dados prontos. Isso é uma escolha deliberada — diferente de `main`/`side`, que dependem só do `record` já carregado, o relacionamento (`notes`) tem sua própria busca. Deixar o slot buscar seus próprios dados evita que a `page.tsx` precise conhecer *todas* as dependências de dados de *todos* os módulos — exatamente o desacoplamento que o Registry (Fase 4) buscava.

#### 4.4 `page.tsx` refatorada — o ganho real da fase

```tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { getEntityAuditTrail } from "@lib/data-provider/rest/audit";
import { DetailShellEngine } from "@components/shells/DetailShellEngine";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@/components/layout/AutoSaveIndicator";
import type { ContextItem, AuditFeedItem } from "@components/shells/MetaDataShell/types";
import type { FavoriteEntity } from "@modules/favorites/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FavoriteDetailPage({ params }: PageProps) {
    const { id } = await params;
    const favoritesModule = getModule<FavoriteEntity>("favorites");
    const dataProvider = createDataProvider();

    const favorite = await dataProvider.read<FavoriteEntity>("favorites", id);
    const auditTrail = await getEntityAuditTrail("favorites", id);

    const contextItems: ContextItem[] = [
        { key: "createdAt", label: "Criado em", value: favorite.createdAt.slice(0, 16).replace("T", ", ") },
        { key: "userId", label: "Usuário", value: favorite.user.email ?? "—" },
        { key: "tenantId", label: "Tenant", value: favorite.tenant.legalName ?? "—" },
    ];

    const auditItems: AuditFeedItem[] = auditTrail.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        userEmail: entry.user.email,
        tenantName: entry.tenant.legalName,
        summary: entry.after ? `Antes: ${entry.before ?? "—"} | Depois: ${entry.after}` : "—",
    }));

    return (
        <AutoSaveStatusProvider>
            <AppTopbar title={favoritesModule.label} autosave={<AutoSaveIndicator />} />
            <div className="px-4 py-2">
                <DetailShellEngine<FavoriteEntity>
                    moduleDefinition={favoritesModule}
                    record={favorite}
                    contextItems={contextItems}
                    auditItems={auditItems}
                    title={favoritesModule.label}
                />
            </div>
        </AutoSaveStatusProvider>
    );
}
```

O que sobrou na `page.tsx`: **busca de dados de topo** (`favorite`, `auditTrail`) e **mapeamento para os tipos genéricos** (`contextItems`, `auditItems`). Isso é intencional — o *dado bruto vindo do backend* é específico do módulo (só `favorites` sabe que tem `tenant.legalName`), então continua na página. O que saiu foi a **decisão de layout** (onde cada coisa aparece na tela), que agora vive no contrato.

---

### 5. Testes práticos com checkpoints

**Checkpoint 1 — engine lança erro corretamente**
Remova temporariamente `detailLayout` do contrato de `favorites` e acesse `/favorites/[id]`. Confirme que o erro `Módulo "favorites" não define detailLayout` aparece no server log (não um erro genérico de `undefined`). Devolva o `detailLayout`.

**Checkpoint 2 — slots independentes**
Comente só o `side` no `detailLayout`. Recarregue a página de detalhe. O formulário e as notas devem continuar renderizando normalmente, só a coluna lateral de metadata some — sem quebrar layout. Isso prova que os slots são realmente opcionais e desacoplados.

**Checkpoint 3 — reuso em outro módulo (teste de arquitetura)**
Sem escrever nenhum `DetailShellEngine` novo, pegue um módulo simples qualquer (pode ser um mock) e defina um `detailLayout` mínimo (`main` apenas, mostrando `JSON.stringify(record)`). Se a tela de detalhe desse módulo renderizar usando o **mesmo** `DetailShellEngine`, a Fase 8 está completa — esse é o teste que prova que a composição é genérica e não amarrada a `favorites`.

**Checkpoint 4 — regressão visual**
Compare lado a lado a página antiga e a nova: mesmo HTML renderizado (form, notas, sidebar de metadata nos mesmos lugares). Se houver diferença de layout, o problema está na estrutura `flex` do `DetailShellEngine`, não na lógica de dados.

---

Com isso as 8 fases fecham o ciclo: `DataProvider` (dado) → `TypeView`/`RecordListHost` (listagem) → `Registry`+`moduleDefinition` (contrato) → `FormView` (edição) → `MetaDataShell`/`RelationShell` (contexto e relações) → `DetailShellEngine` (composição final orientada a contrato). Quer que eu monte a avaliação de 6 perguntas estilo tech lead para fechar essa fase, ou prefere já aplicar `defineRecordModule` + `detailLayout` a um segundo módulo real do projeto para validar o reuso?
