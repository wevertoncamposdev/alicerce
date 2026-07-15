export type PermissionType = 'READ' | 'WRITE' | 'DELETE';

export interface PermissionEntity {
    id: string;
    tenantId: string;
    name: string;
    description?: string | null;
    type: PermissionType;
    resource?: string | null;
}

export interface PermissionPayload {
    tenantId: string;
    name: string;
    type: PermissionType;
    description?: string;
    resource?: string;
}
