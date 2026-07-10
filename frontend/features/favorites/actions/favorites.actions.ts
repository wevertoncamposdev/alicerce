'use server';
import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api-server';
import {
    CreateFavoritePayload,
    UpdateFavoritePayload,
    FavoriteActionState,
} from '../favorite.types';

/**
 * Cria um novo favorito.
 * Usada com useActionState no FavoritesCreateForm.
 */
export async function createFavorite(
    _prev: FavoriteActionState,
    formData: FormData,
): Promise<FavoriteActionState> {
    try {
        const payload: CreateFavoritePayload = {
            title: formData.get('title') as string,
            url: formData.get('url') as string,
        };

        await apiServer.post('favorites', payload);
        revalidatePath('/favorites');

        return { error: null };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

/**
 * Atualiza um favorito existente.
 * Usada com useActionState.bind(null, id) no FavoritesEditForm.
 */
export async function updateFavorite(
    id: string,
    _prev: FavoriteActionState,
    formData: FormData,
): Promise<FavoriteActionState> {
    try {
        const payload: UpdateFavoritePayload = {
            title: formData.get('title') as string,
            url: formData.get('url') as string,
        };

        await apiServer.patch(`favorites/${id}`, payload);
        revalidatePath('/favorites');

        return { error: null };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

/**
 * Remove um favorito.
 * Chamada diretamente (não via useActionState) pelo FavoritesDeleteButton.
 */
export async function deleteFavorite(id: string): Promise<void> {
    await apiServer.delete(`favorites/${id}`);
    revalidatePath('/favorites');
}