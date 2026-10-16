import { apiServer } from "@lib/api-server"; // ajuste pro caminho real do seu apiServer
import type { SearchArgs, SearchResult } from "@core/data-provider/types";
import type { FavoriteEntity } from "@modules/favorites/types/types";


// modules/favorites/config/provider.ts
export async function searchFavorites(args: SearchArgs): Promise<SearchResult<FavoriteEntity>> {
    const body = {
        searchText: args.searchText,
        groupBy: args.groupBy,
        sort: args.sort,
        pagination: {
            pageIndex: args.pagination?.pageIndex ?? 0,
            pageSize: args.pagination?.pageSize ?? 20,
        },
        filters: args.filters,
    };

    const response = await apiServer.search<{ items: FavoriteEntity[]; total: number; page: number; limit: number }>(
        "examples", // backend renomeou favorites -> examples (PLAN.md, Etapa 7.D); rename completo do módulo no frontend fica pra 7.F
        body,   // objeto de verdade agora, não uma URLSearchParams stringificada
    );

    return {
        data: response.items,
        pagination: {
            total: response.total,
            page: response.page,
            limit: response.limit,
            pages: Math.ceil(response.total / response.limit),
        },
    };
}

export async function readFavorite(id: string): Promise<FavoriteEntity> {
    const response: FavoriteEntity = await apiServer.get(`examples/${id}`, { cache: "no-store" });
    return response;
}

export async function createFavorite(payload: unknown): Promise<FavoriteEntity> {
    const response: FavoriteEntity = await apiServer.post("examples", payload);
    return response;
}

export async function updateFavorite(id: string, payload: unknown): Promise<FavoriteEntity> {
    const response: FavoriteEntity = await apiServer.patch(`examples/${id}`, payload);
    return response;
}

export async function deleteFavorite(id: string): Promise<void> {
    await apiServer.delete(`examples/${id}`);
}