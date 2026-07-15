import { apiServer } from "@lib/api-server"; // ajuste pro caminho real do seu apiServer
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { Favorite } from "@/features/favorites/favorite.types";


export async function searchFavorites(args: SearchArgs): Promise<SearchResult<Favorite>> {
    const query = new URLSearchParams();

    if (args.searchText) query.set("search", args.searchText);
    if (args.groupBy?.length) query.set("groupBy", args.groupBy.join(","));
    if (args.sort?.[0]) {
        query.set("sortField", args.sort[0].field);
        query.set("sortDirection", args.sort[0].direction);
    }
    query.set("page", String((args.pagination?.pageIndex ?? 0) + 1));
    query.set("limit", String(args.pagination?.pageSize ?? 20));

    if (args.filters) {
        for (const [key, value] of Object.entries(args.filters)) {
            if (value !== undefined && value !== null) {
                query.set(key, String(value));
            }
        }
    }

    // response JÁ é o corpo — sem wrapper .data
    const response = await apiServer.search<{ items: Favorite[]; total: number; page: number; limit: number }>(
        "favorites",
        args, // manda o SearchArgs inteiro, sem achatar em query string
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

export async function readFavorite(id: string): Promise<Favorite> {
    const response: Favorite = await apiServer.get(`favorites/${id}`, { cache: "no-store" });
    return response;
}

export async function createFavorite(payload: unknown): Promise<Favorite> {
    const response: Favorite = await apiServer.post("favorites", payload);
    return response;
}

export async function updateFavorite(id: string, payload: unknown): Promise<Favorite> {
    const response: Favorite = await apiServer.put(`favorites/${id}`, payload);
    return response;
}

export async function deleteFavorite(id: string): Promise<void> {
    await apiServer.delete(`favorites/${id}`);
}