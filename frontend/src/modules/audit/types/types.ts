export type AuditEntry = {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    type?: string;
    // GET /tenant/:tenantId/audit/:id (findOne) já devolve parseado (objeto);
    // search/findAll ainda devolvem a string JSON crua — a tela de detail
    // (único lugar que exibe before/after) trata os dois casos.
    before: unknown;
    after: unknown;
    createdAt: string;
    userId: string;
    user?: {
        id: string;
        email: string;
        name?: string | null;
    };
    tenant?: {
        id: string;
        legalName: string;
    };
};
