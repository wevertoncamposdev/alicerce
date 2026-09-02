import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { RoleEntity, CreateRolePayload, UpdateRolePayload } from "../types/types";
import { getSessionTenantId } from "@lib/session";

function normalizeEntityList<T extends { id?: string }>(rows: unknown, nestedKey: string): T[] {
    if (!Array.isArray(rows)) return [];

    return rows
        .map((row) => (row && typeof row === "object" && nestedKey in row ? (row as Record<string, unknown>)[nestedKey] : row))
        .filter((entry): entry is T => Boolean(entry && typeof entry === "object" && "id" in entry));
}

export async function searchRoles(args: SearchArgs): Promise<SearchResult<RoleEntity>> {
    const response = await apiServer.search<{ items: RoleEntity[]; total: number; page: number; limit: number }>(
        "roles",
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

export async function readRole(id: string): Promise<RoleEntity> {
    return apiServer.get<RoleEntity>(`roles/${id}`);
}

export async function createRole(payload: unknown): Promise<RoleEntity> {
    return apiServer.post<RoleEntity>("roles", payload as CreateRolePayload);
}

export async function updateRole(id: string, payload: unknown): Promise<RoleEntity> {
    return apiServer.patch<RoleEntity>(`roles/${id}`, payload as UpdateRolePayload);
}

export async function deleteRole(id: string): Promise<void> {
    await apiServer.delete(`roles/${id}`);
}

export async function readRolePermissions(id: string) {
    const tenantId = await getSessionTenantId();
    const rows = await apiServer.get<Array<Record<string, unknown>>>(
        `roles/${id}/permissions`,
        { query: { tenantId } },
    );
    return normalizeEntityList<import("@/modules/permissions/types/types").PermissionEntity>(rows, "permission");
}

export async function readRoleUsers(id: string) {
    const tenantId = await getSessionTenantId();
    const rows = await apiServer.get<Array<Record<string, unknown>>>(
        `roles/${id}/users`,
        { query: { tenantId } },
    );
    return normalizeEntityList<import("@/modules/users/types/types").UserEntity>(rows, "user");
}
