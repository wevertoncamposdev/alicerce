export type AuditEntry = {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    before: string | null;
    after: string | null;
    createdAt: string;
    userId: string;
    user?: {
        id: string;
        email: string;
    };
    tenant?: {
        id: string;
        legalName: string;
    };
};
