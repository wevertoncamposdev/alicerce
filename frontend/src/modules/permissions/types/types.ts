export type PermissionEntity = {
    id: string;
    name: string;
    type?: string | null;
    resource?: string | null;
    description?: string | null;
    createdAt?: string;
    tenantId: string;
    // Papéis que usam esta permissão (etapa 8.4) — batched pelo backend,
    // sem N+1 por linha.
    roles?: { id: string; name: string }[];
};

export type ContextItem = { key: string; label: string; value: string };
