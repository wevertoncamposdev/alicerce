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

export type ContextItem = { key: string; label: string; value: string };