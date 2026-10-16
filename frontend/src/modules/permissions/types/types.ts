export type PermissionEntity = {
    id: string;
    name: string;
    type?: string | null;
    resource?: string | null;
    description?: string | null;
    createdAt?: string;
    tenantId: string;
};

export type ContextItem = { key: string; label: string; value: string };
