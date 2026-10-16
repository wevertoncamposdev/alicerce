// modules/favorites/config/provider.ts
//
// Backend renomeou favorites -> examples (PLAN.md, Etapa 7.D) — o resource
// REST já é "examples"; o rename completo do módulo no frontend (pasta,
// nomes de função/componente) continua fora de escopo aqui, só a
// implementação migrou pro helper compartilhado (Etapa 7.F).
import { createRestDataHandlers } from "@core/data-provider/rest-handlers";
import type { FavoriteEntity } from "@modules/favorites/types/types";

export const {
    search: searchFavorites,
    read: readFavorite,
    create: createFavorite,
    update: updateFavorite,
    delete: deleteFavorite,
} = createRestDataHandlers<FavoriteEntity>("examples");
