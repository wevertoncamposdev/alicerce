// modules/favorites/config/contract.tsx
import { defineRecordModule, registerModule } from "@lib/registry";
import type { DetailLayout } from "@lib/registry/types";
import {
    searchFavorites, readFavorite, createFavorite, updateFavorite, deleteFavorite,
} from "./provider";
import {
    parseFavoritesListState, serializeFavoritesListState,
} from "@lib/query-state/favorites-query-state";
import type { Favorite, FavoriteEntity } from "@/modules/favorites/types/types";

import { FormView } from "@/components/Type-View/FormView/FormView";
import { MetaDataShell } from "@/components/DetailView/MetaDataView";
import { MetaDataSidebar } from "@/components/DetailView/MetaDataView/MetaDataSidebar";
import { RelationTablePanel } from "@/components/DetailView/RelationView/RelationTablePanel";
import { listFavoriteNotes } from "./notes-provider";

const formFields = [
    { name: "title" as const, label: "Título", placeholder: "Digite o título", type: "text" as const, required: true },
    { name: "url" as const, label: "URL", placeholder: "Digite a URL", type: "url" as const, required: true },
];

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

export const favoritesModule = defineRecordModule<FavoriteEntity>({
    model: "favorites",
    label: "Favoritos",
    views: ["list", "cards", "graph", "text", "form"],
    defaultView: "list",
    dataHandlers: { search: searchFavorites, read: readFavorite, create: createFavorite, update: updateFavorite, delete: deleteFavorite },
    formFields,
    parseListState: parseFavoritesListState,
    serializeListState: serializeFavoritesListState,
    detailLayout: favoritesDetailLayout,
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