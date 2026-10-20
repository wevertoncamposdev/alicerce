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

export interface PermissionMatrixGroup {
    resource: string;
    permissions: Array<{
        id: string;
        name: string;
        type: string;
        description: string | null;
        granted: boolean;
    }>;
}

// Etapa 3.5 (Plano Base.md) — matriz de permissões por recurso. Usada pela
// aba Permissões do Detail de Papéis (8.3).
export async function getPermissionMatrix(roleId: string): Promise<PermissionMatrixGroup[]> {
    return apiServer.get<PermissionMatrixGroup[]>(`roles/${roleId}/permission-matrix`);
}

// Troca o conjunto INTEIRO de permissões de catálogo do papel — não é um
// toggle por checkbox, é "manda o conjunto completo marcado" (ver
// RolesService.replacePermissions, backend).
export async function replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<PermissionMatrixGroup[]> {
    return apiServer.put<PermissionMatrixGroup[]>(`roles/${roleId}/permissions`, { permissionIds });
}
