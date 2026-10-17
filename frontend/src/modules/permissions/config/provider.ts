import { apiServer } from "@lib/api-server";
import { createRestDataHandlers, normalizeEntityList } from "@core/data-provider/rest-handlers";
import type { PermissionEntity } from "../types/types";
import { getSessionTenantId } from "@lib/session";
import { RoleEntity } from "@modules/roles/types/types";

export const {
    search: searchPermissions,
    read: readPermission,
    create: createPermission,
    update: updatePermission,
    delete: deletePermission,
} = createRestDataHandlers<PermissionEntity>("permissions");

//Roles

export async function readPermissionRoles(id: string): Promise<RoleEntity[]> {
    const tenantId = await getSessionTenantId();
    const rows = await apiServer.get<Array<Record<string, unknown>>>(
        `permissions/${id}/roles`,
        { query: { tenantId } },
    );
    return normalizeEntityList<RoleEntity>(rows, "role");
}
