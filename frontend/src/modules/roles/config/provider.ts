import { apiServer } from "@lib/api-server";
import { createRestDataHandlers, normalizeEntityList } from "@core/data-provider/rest-handlers";
import type { RoleEntity } from "../types/types";
import { getSessionTenantId } from "@lib/session";

export const {
    search: searchRoles,
    read: readRole,
    create: createRole,
    update: updateRole,
    delete: deleteRole,
} = createRestDataHandlers<RoleEntity>("roles");

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
