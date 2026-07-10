import 'server-only';
import { apiServer } from '@/lib/api-server';
import { FavoriteEntity } from '../favorite.types';

/**
 * Busca todos os favoritos do usuário autenticado.
 * Chamado diretamente de Server Components (page.tsx async).
 * O apiServer já injeta Bearer token + x-tenant-id automaticamente.
 */
export async function getFavorites(): Promise<FavoriteEntity[]> {
    return apiServer.get<FavoriteEntity[]>('favorites');
}