import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { RoleEntity, CreateRolePayload, UpdateRolePayload } from "@modules/roles/types/types";

export async function search(args: SearchArgs): Promise<SearchResult<RoleEntity>> {
    const response = await apiServer.search<{ items: RoleEntity[]; total: number; page: number; limit: number }>(
        "role",
        {
            searchText: args.searchText,
            sort: args.sort,
            pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
            filters: args.filters,
        },
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

export async function read(id: string): Promise<RoleEntity> {
    return apiServer.get<RoleEntity>(`role/${id}`);
}

export async function create(payload: unknown): Promise<RoleEntity> {
    return apiServer.post<RoleEntity>("role", payload as CreateRolePayload);
}

export async function update(id: string, payload: unknown): Promise<RoleEntity> {
    return apiServer.patch<RoleEntity>(`role/${id}`, payload as UpdateRolePayload);
}

export async function remove(id: string): Promise<void> {
    await apiServer.delete(`role/${id}`);
}