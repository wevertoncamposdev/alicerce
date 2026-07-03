import { apiClient } from '@/lib/api-client';
import { RoleEntity, RolePayload } from '../role.types';

// Nota: autenticação agora é via cookie httpOnly (lida pelo proxy em
// /api/proxy), então nenhum destes métodos precisa mais receber `token`.

export interface FetchRolesParams {
    tenantId: string;
}

export interface UpdateRoleParams {
    roleId: string;
    payload: Partial<RolePayload>;
}

export interface RemoveRoleParams {
    roleId: string;
}

export interface AttachRoleUserParams {
    roleId: string;
    tenantId: string;
    userId: string;
}

export interface AttachRolePermissionParams {
    roleId: string;
    tenantId: string;
    permissionId: string;
}

export async function fetchRoles(params: FetchRolesParams): Promise<RoleEntity[]> {
    return apiClient.get<RoleEntity[]>(`roles?tenantId=${params.tenantId}`);
}

export async function createRole(payload: RolePayload): Promise<RoleEntity> {
    return apiClient.post<RoleEntity>('roles', payload);
}

export async function updateRole(params: UpdateRoleParams): Promise<RoleEntity> {
    return apiClient.patch<RoleEntity>(`roles/${params.roleId}`, params.payload);
}

export async function removeRole(params: RemoveRoleParams): Promise<null> {
    return apiClient.delete<null>(`roles/${params.roleId}`);
}

export async function attachRoleUser(params: AttachRoleUserParams): Promise<null> {
    return apiClient.post<null>(`roles/${params.roleId}/users`, {
        tenantId: params.tenantId,
        userId: params.userId,
    });
}

export async function attachRolePermission(params: AttachRolePermissionParams): Promise<null> {
    return apiClient.post<null>(`roles/${params.roleId}/permissions`, {
        tenantId: params.tenantId,
        permissionId: params.permissionId,
    });
}
