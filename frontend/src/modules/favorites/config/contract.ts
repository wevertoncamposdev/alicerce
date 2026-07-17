import { defineRecordModule } from "@lib/registry";
import { registerModule } from "@lib/registry";
import {
    searchFavorites,
    readFavorite,
    createFavorite,
    updateFavorite,
    deleteFavorite,
} from "./provider";
import {
    parseFavoritesListState,
    serializeFavoritesListState,
} from "@lib/query-state/favorites-query-state";
import type { Favorite, FavoriteEntity } from "@modules/favorites/types";

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
    formFields: [
        { name: "title", label: "Título", placeholder: "Digite o título", type: "text", required: true },
        { name: "url", label: "URL", placeholder: "Digite a URL", type: "url", required: true },
    ],
    parseListState: parseFavoritesListState,
    serializeListState: serializeFavoritesListState,
});

registerModule(favoritesModule);
