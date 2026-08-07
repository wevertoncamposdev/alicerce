export type ContextItem = {
    key: string;
    label: string;
    value: string;
};

export type AuditFeedItem = {
    id: string;
    action: string;
    createdAt: string;
    userEmail: string;
    tenantName: string;
    summary: string;
};