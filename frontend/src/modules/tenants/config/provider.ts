import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { TenantEntity, CreateTenantPayload, UpdateTenantPayload } from "../types/types";

export async function searchTenants(args: SearchArgs): Promise<SearchResult<TenantEntity>> {
    const response = await apiServer.search<{ items: TenantEntity[]; total: number; page: number; limit: number }>(
        "tenant",
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

export async function readTenant(id: string): Promise<TenantEntity> {
    return apiServer.get<TenantEntity>(`tenant/${id}`);
}

export async function createTenant(payload: unknown): Promise<TenantEntity> {
    return apiServer.post<TenantEntity>("tenant", payload as CreateTenantPayload);
}

export async function updateTenant(id: string, payload: unknown): Promise<TenantEntity> {
    return apiServer.patch<TenantEntity>(`tenant/${id}`, payload as UpdateTenantPayload);
}

export async function deleteTenant(id: string): Promise<void> {
    await apiServer.delete(`tenant/${id}`);
}

export async function readTenantUsers(id: string) {
    return apiServer.get<import("@/modules/users/types/types").UserEntity[]>(`tenant/${id}/users`);
}

export async function readTenantRoles(id: string) {
    return apiServer.get<import("@/modules/roles/types/types").RoleEntity[]>(`tenant/${id}/roles`);
}