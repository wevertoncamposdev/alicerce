import { apiRequest } from '@/lib/api-client';
import { PermissionEntity, PermissionPayload } from '../permission.types';

export interface FetchPermissionsParams {
    token: string;
    tenantId: string;
}

export interface CreatePermissionParams {
    token: string;
    payload: PermissionPayload;
}

export interface UpdatePermissionParams {
    token: string;
    permissionId: string;
    payload: Partial<PermissionPayload>;
}

export interface RemovePermissionParams {
    token: string;
    permissionId: string;
}

export async function fetchPermissions(params: FetchPermissionsParams): Promise<PermissionEntity[]> {
    return apiRequest<PermissionEntity[]>(`/permissions?tenantId=${params.tenantId}`, {
        method: 'GET',
        token: params.token,
    });
}

export async function createPermission(params: CreatePermissionParams): Promise<PermissionEntity> {
    return apiRequest<PermissionEntity>('/permissions', {
        method: 'POST',
        token: params.token,
        body: params.payload,
    });
}

export async function updatePermission(params: UpdatePermissionParams): Promise<PermissionEntity> {
    return apiRequest<PermissionEntity>(`/permissions/${params.permissionId}`, {
        method: 'PATCH',
        token: params.token,
        body: params.payload,
    });
}

export async function removePermission(params: RemovePermissionParams): Promise<null> {
    return apiRequest<null>(`/permissions/${params.permissionId}`, {
        method: 'DELETE',
        token: params.token,
    });
}
