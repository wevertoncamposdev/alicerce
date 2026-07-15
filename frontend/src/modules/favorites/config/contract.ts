import { defineRecordModule } from "@lib/registry";
import { registerModule } from "@lib/registry";
import {
    searchFavorites,
    readFavorite,
    createFavorite,
    updateFavorite,
    deleteFavorite,
} from "@lib/data-provider/rest/favorites";
import {
    parseFavoritesListState,
    serializeFavoritesListState,
} from "@lib/query-state/favorites-query-state";
import type { Favorite } from "@modules/favorites/types";

export const favoritesModule = defineRecordModule<Favorite>({
    model: "favorites",
    label: "Favoritos",
    views: ["list", "cards", "graph", "text", "form"],
    defaultView: "list",
    dataHandlers: {
        search: searchFavorites,
        read: readFavorite,
        create: createFavorite,
        update: updateFavorite,
        delete: deleteFavorite,
    },
    parseListState: parseFavoritesListState,
    serializeListState: serializeFavoritesListState,
});

registerModule(favoritesModule);
