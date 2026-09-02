import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { PermissionEntity, CreatePermissionPayload, UpdatePermissionPayload } from "../types/types";
import { getSessionTenantId } from "@lib/session";
import { RoleEntity } from "@/modules/roles/types/types";

function normalizeEntityList<T extends { id?: string }>(rows: unknown, nestedKey: string): T[] {
    if (!Array.isArray(rows)) return [];

    return rows
        .map((row) => (row && typeof row === "object" && nestedKey in row ? (row as Record<string, unknown>)[nestedKey] : row))
        .filter((entry): entry is T => Boolean(entry && typeof entry === "object" && "id" in entry));
}

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

//Roles

export async function readPermissionRoles(id: string): Promise<RoleEntity[]> {
    const tenantId = await getSessionTenantId();
    const rows = await apiServer.get<Array<Record<string, unknown>>>(
        `permissions/${id}/roles`,
        { query: { tenantId } },
    );
    return normalizeEntityList<RoleEntity>(rows, "role");
}
