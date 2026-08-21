import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { UserEntity, CreateUserPayload, UpdateUserPayload } from "../types/types";

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
    return apiServer.get<import("@/modules/roles/types/types").RoleEntity[]>(`user/${id}/roles`);
}