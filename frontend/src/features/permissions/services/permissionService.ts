import { apiClient } from '@lib/api-client';
import { PermissionEntity, PermissionPayload } from '@/features/permissions/permission.types';

// Nota: autenticação agora é via cookie httpOnly (lida pelo proxy em
// /api/proxy), então nenhum destes métodos precisa mais receber `token`.

export interface FetchPermissionsParams {
    tenantId: string;
}

export interface UpdatePermissionParams {
    permissionId: string;
    payload: Partial<PermissionPayload>;
}

export interface RemovePermissionParams {
    permissionId: string;
}

export async function fetchPermissions(params: FetchPermissionsParams): Promise<PermissionEntity[]> {
    return apiClient.get<PermissionEntity[]>(`permissions?tenantId=${params.tenantId}`);
}

export async function createPermission(payload: PermissionPayload): Promise<PermissionEntity> {
    return apiClient.post<PermissionEntity>('permissions', payload);
}

export async function updatePermission(params: UpdatePermissionParams): Promise<PermissionEntity> {
    return apiClient.patch<PermissionEntity>(`permissions/${params.permissionId}`, params.payload);
}

export async function removePermission(params: RemovePermissionParams): Promise<null> {
    return apiClient.delete<null>(`permissions/${params.permissionId}`);
}
