export interface FavoriteEntity {
    id: string;
    url: string;
    title: string;
    tenantId?: string;
    userId?: string;
    createdAt: string;
}

export interface CreateFavoritePayload {
    title: string;
    url: string;
}

export interface UpdateFavoritePayload {
    title?: string;
    url?: string;
}

export type FavoriteActionState = {
    error: string | null;
};