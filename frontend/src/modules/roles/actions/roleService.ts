'use server';

import { apiServer } from '@lib/api-server';

// Nota: autenticação agora é via cookie httpOnly, lida direto do servidor
// por `apiServer` (AGENTS §4.1) — nenhum destes métodos precisa receber
// `token`.

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

export async function attachRoleUser(params: AttachRoleUserParams): Promise<null> {
    if (!params.tenantId) {
        throw new Error('TenantId is required to attach a role to a user');
    }

    return apiServer.post<null>(`roles/${params.roleId}/users`, {
        tenantId: params.tenantId,
        userId: params.userId,
    });
}

export async function attachRolePermission(params: AttachRolePermissionParams): Promise<null> {
    if (!params.tenantId) {
        throw new Error('TenantId is required to attach a permission to a role');
    }

    return apiServer.post<null>(`roles/${params.roleId}/permissions`, {
        tenantId: params.tenantId,
        permissionId: params.permissionId,
    });
}

export async function detachRoleUser(params: { roleId: string; tenantId: string; userId: string }): Promise<null> {
    const qs = params.tenantId ? `?tenantId=${params.tenantId}` : "";
    return apiServer.delete<null>(`roles/${params.roleId}/users/${params.userId}${qs}`);
}

export async function detachRolePermission(params: { roleId: string; tenantId: string; permissionId: string }): Promise<null> {
    const qs = params.tenantId ? `?tenantId=${params.tenantId}` : "";
    return apiServer.delete<null>(`roles/${params.roleId}/permissions/${params.permissionId}${qs}`);
}
