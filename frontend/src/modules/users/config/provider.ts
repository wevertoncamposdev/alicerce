import { apiServer } from "@lib/api-server";
import { createRestDataHandlers, normalizeEntityList } from "@core/data-provider/rest-handlers";
import type { UserEntity } from "../types/types";

export const {
    search: searchUsers,
    read: readUser,
    create: createUser,
    update: updateUser,
    delete: deleteUser,
} = createRestDataHandlers<UserEntity>("user");

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
