import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { PermissionEntity, CreatePermissionPayload, UpdatePermissionPayload } from "../types/types";

export async function searchPermissions(args: SearchArgs): Promise<SearchResult<PermissionEntity>> {
    const response = await apiServer.search<{ items: PermissionEntity[]; total: number; page: number; limit: number }>(
        "permissions",
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

export async function readPermission(id: string): Promise<PermissionEntity> {
    return apiServer.get<PermissionEntity>(`permissions/${id}`);
}

export async function createPermission(payload: unknown): Promise<PermissionEntity> {
    return apiServer.post<PermissionEntity>("permissions", payload as CreatePermissionPayload);
}

export async function updatePermission(id: string, payload: unknown): Promise<PermissionEntity> {
    return apiServer.patch<PermissionEntity>(`permissions/${id}`, payload as UpdatePermissionPayload);
}

export async function deletePermission(id: string): Promise<void> {
    await apiServer.delete(`permissions/${id}`);
}
