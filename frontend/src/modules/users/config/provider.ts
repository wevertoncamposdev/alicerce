import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { UserEntity, CreateUserPayload, UpdateUserPayload } from "../types/types";

function normalizeEntityList<T extends { id?: string }>(rows: unknown, nestedKey: string): T[] {
    if (!Array.isArray(rows)) return [];

    return rows
        .map((row) => (row && typeof row === "object" && nestedKey in row ? (row as Record<string, unknown>)[nestedKey] : row))
        .filter((entry): entry is T => Boolean(entry && typeof entry === "object" && "id" in entry));
}

export async function searchUsers(args: SearchArgs): Promise<SearchResult<UserEntity>> {
    const response = await apiServer.search<{ items: UserEntity[]; total: number; page: number; limit: number }>(
        "user",
        {
            searchText: args.searchText,
            sort: args.sort,
            pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
            filters: args.filters,
        },
    );
    return {
        data: response.items,
        pagination: { total: response.total, page: response.page, limit: response.limit, pages: Math.ceil(response.total / response.limit) },
    };
}

export async function readUser(id: string): Promise<UserEntity> {
    return apiServer.get<UserEntity>(`user/${id}`);
}

export async function createUser(payload: unknown): Promise<UserEntity> {
    // tenantId não vem mais daqui — o backend agora resolve via @TenantId() no create também,
    // se você aplicar o mesmo ajuste no endpoint de create (ver observação abaixo).
    return apiServer.post<UserEntity>("user", payload as CreateUserPayload);
}

export async function updateUser(id: string, payload: unknown): Promise<UserEntity> {
    return apiServer.patch<UserEntity>(`user/${id}`, payload as UpdateUserPayload);
}

export async function deleteUser(id: string): Promise<void> {
    await apiServer.delete(`user/${id}`);
}

export async function readUserRoles(id: string) {
    const rows = await apiServer.get<Array<Record<string, unknown>>>(`user/${id}/roles`);
    return normalizeEntityList<import("@/modules/roles/types/types").RoleEntity>(rows, "role");
}

export async function readUserPermissions(id: string) {
    const rows = await apiServer.get<Array<Record<string, unknown>>>(`user/${id}/permissions`, {
        query: { tenantId: await (await import("@lib/session")).getSessionTenantId() },
    });
    return normalizeEntityList<import("@/modules/permissions/types/types").PermissionEntity>(rows, "permission");
}