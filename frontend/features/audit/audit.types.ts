export interface AuditEntry {
    id: string;
    tenantId: string;
    userId: string;
    type: string;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: string | null;
    after?: string | null;
    createdAt: string;
}
