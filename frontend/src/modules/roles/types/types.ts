export type RoleType = 'ADMIN' | 'USER' | 'GUEST';

export interface RoleEntity {
    id: string;
    tenantId: string;
    name: string;
    type: RoleType;
    description?: string | null;
    status?: string;
    createdAt?: string;
}

export type CreateRolePayload = {
    tenantId: string;
    name: string;
    type?: string;
    description?: string;
};


export interface RolePayload {
    tenantId: string;
    name: string;
    type: RoleType;
    description?: string;
}

export type ContextItem = { key: string; label: string; value: string };


export type UpdateRolePayload = Partial<CreateRolePayload>;