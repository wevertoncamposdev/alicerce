export type RoleType = 'ADMIN' | 'USER' | 'GUEST';

export interface RoleEntity {
    id: string;
    tenantId: string;
    name: string;
    type: RoleType;
    description?: string | null;
    status?: string;
}

export interface RolePayload {
    tenantId: string;
    name: string;
    type: RoleType;
    description?: string;
}
