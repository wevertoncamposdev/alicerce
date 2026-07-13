import 'server-only';
import { apiServer } from '@/lib/api-server';
import { FavoriteEntity } from '../favorite.types';

/**
 * Busca todos os favoritos do usuário autenticado.
 * Chamado diretamente de Server Components (page.tsx async).
 * O apiServer já injeta Bearer token + x-tenant-id automaticamente.
 */
export async function getFavorites(): Promise<FavoriteEntity[]> {
    const response = await apiServer.get<FavoriteEntity[]>('favorites');
    return response;
}

export async function getFavorite(id: string): Promise<FavoriteEntity> {
    const response = await apiServer.get<FavoriteEntity>(`favorites/${id}`);
    return response;
}