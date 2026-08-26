export type PermissionEntity = {
    id: string;
    name: string;
    type?: string | null;
    resource?: string | null;
    description?: string | null;
    createdAt?: string;
};

export type CreatePermissionPayload = {
    tenantId: string;
    name: string;
    type: string;
    resource?: string;
    description?: string;
};

export type UpdatePermissionPayload = Partial<CreatePermissionPayload>;

export type ContextItem = { key: string; label: string; value: string };
