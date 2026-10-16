export interface FavoriteEntity {
    id: string;
    title: string;
    url: string;
    tenantId?: string;
    userId?: string;
    createdAt: string;
    user: {
        id: string;
        email: string;
    };
    tenant: {
        id: string;
        legalName: string;
    };
}

export type FavoriteNote = {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; email: string };
};