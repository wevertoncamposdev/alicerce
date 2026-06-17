import { apiRequest } from '@/lib/api-client';
import { RoleEntity, RolePayload } from '../role.types';

export interface FetchRolesParams {
    token: string;
    tenantId: string;
}

export interface CreateRoleParams {
    token: string;
    payload: RolePayload;
}

export interface UpdateRoleParams {
    token: string;
    roleId: string;
    payload: Partial<RolePayload>;
}

export interface RemoveRoleParams {
    token: string;
    roleId: string;
}

export interface AttachRoleUserParams {
    token: string;
    roleId: string;
    tenantId: string;
    userId: string;
}

export interface AttachRolePermissionParams {
    token: string;
    roleId: string;
    tenantId: string;
    permissionId: string;
}

export async function fetchRoles(params: FetchRolesParams): Promise<RoleEntity[]> {
    return apiRequest<RoleEntity[]>(`/roles?tenantId=${params.tenantId}`, {
        method: 'GET',
        token: params.token,
    });
}

export async function createRole(params: CreateRoleParams): Promise<RoleEntity> {
    return apiRequest<RoleEntity>('/roles', {
        method: 'POST',
        token: params.token,
        body: params.payload,
    });
}

export async function updateRole(params: UpdateRoleParams): Promise<RoleEntity> {
    return apiRequest<RoleEntity>(`/roles/${params.roleId}`, {
        method: 'PATCH',
        token: params.token,
        body: params.payload,
    });
}

export async function removeRole(params: RemoveRoleParams): Promise<null> {
    return apiRequest<null>(`/roles/${params.roleId}`, {
        method: 'DELETE',
        token: params.token,
    });
}

export async function attachRoleUser(params: AttachRoleUserParams): Promise<null> {
    return apiRequest<null>(`/roles/${params.roleId}/users`, {
        method: 'POST',
        token: params.token,
        body: {
            tenantId: params.tenantId,
            userId: params.userId,
        },
    });
}

export async function attachRolePermission(params: AttachRolePermissionParams): Promise<null> {
    return apiRequest<null>(`/roles/${params.roleId}/permissions`, {
        method: 'POST',
        token: params.token,
        body: {
            tenantId: params.tenantId,
            permissionId: params.permissionId,
        },
    });
}
