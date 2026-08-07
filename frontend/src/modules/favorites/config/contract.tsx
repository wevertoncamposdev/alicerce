// modules/favorites/config/contract.tsx
import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout, ListLayout } from "@lib/registry/types";
import { createRecordFormAction } from "@lib/registry/actions";
import { createListQueryState } from "@lib/query-state/list-query-state";

import {
    searchFavorites, readFavorite, createFavorite, updateFavorite, deleteFavorite,
} from "./provider";

import type { FavoriteEntity } from "@/modules/favorites/types/types";
import type { ContextItem } from "@/components/DetailView/MetaDataView/types";

import { FormView } from "@/components/TypeView/FormView/FormView";
import { CardsView } from "@/components/TypeView/CardsView/CardsView";
import { MetaDataView } from "@/components/DetailView/MetaDataView";
import { MetaDataSidebar } from "@/components/DetailView/MetaDataView/MetaDataSidebar";
import { RelationTablePanel } from "@/components/DetailView/RelationView/RelationTablePanel";
import { FavoritesGraphView } from "@modules/favorites/components/FavoritesGraphView";
import { FavoritesListView } from "@modules/favorites/components/FavoritesListView";
import { listFavoriteNotes } from "./notes-provider";

//ADAPTER

const formFields = [
    { name: "title" as const, label: "Título", placeholder: "Digite o título", type: "text" as const, required: true },
    { name: "url" as const, label: "URL", placeholder: "Digite a URL", type: "url" as const, required: true },
];


// ------------------------------------------------------------
// Listagem — antes montado na page, agora 100% do módulo
// ------------------------------------------------------------
const { parseListState: parseFavoritesListState, serializeListState: serializeFavoritesListState } = createListQueryState();

const createFavoriteAction = createRecordFormAction.bind(
    null,
    "favorites",
    formFields.map((f) => f.name),
);

const favoritesListLayout: ListLayout<FavoriteEntity> = {
    list: ({ data }) => <FavoritesListView data={data} />,
    graph: ({ data }) => <FavoritesGraphView data={data} />,
    cards: ({ data }) => <CardsView data={data} detail="/favorites" />,
    form: () => (
        <FormView<FavoriteEntity>
            mode="create"
            fields={formFields}
            createAction={createFavoriteAction}
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
            <MetaDataView contextItems={contextItems} auditItems={auditItems} />
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