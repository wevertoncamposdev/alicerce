export type RoleEntity = {
    id: string;
    name: string;
    type?: string | null;
    description?: string | null;
    createdAt?: string;
};

export type ContextItem = { key: string; label: string; value: string };

export type CreateRolePayload = {
    tenantId: string;
    name: string;
    type?: string;
    description?: string;
};

export type UpdateRolePayload = Partial<CreateRolePayload>;