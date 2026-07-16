export interface FavoriteEntity {
    id: string;
    title: string;
    url: string;
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

export interface Favorite {
    id: string;
    title: string;
    url: string;
    createdAt: string;
}

export interface FavoriteChartsProps {
    favorites: FavoriteEntity[]
}
