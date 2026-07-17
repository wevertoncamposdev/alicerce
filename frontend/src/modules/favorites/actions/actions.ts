'use server';
import { revalidatePath } from 'next/cache';
import { CreateFavoritePayload, UpdateFavoritePayload } from '@/modules/favorites/types/types';
import { apiServer } from '@lib/api-server';

export interface ActionState { ok: boolean; message?: string }

export async function createFavorite(_prev: ActionState, formData: FormData): Promise<ActionState> {

    const payload: CreateFavoritePayload = {
        title: formData.get('title') as string,
        url: formData.get('url') as string,
    };

    if (!payload.title) return { ok: false, message: 'Título obrigatório' };
    if (!payload.url) return { ok: false, message: 'URL obrigatório' };

    await apiServer.post<CreateFavoritePayload>('favorites', payload);
    revalidatePath('/favorites');

    return { ok: true, message: 'Criado com sucesso!' };
}

export async function updateFavorite(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
    const payload: UpdateFavoritePayload = {
        title: formData.get('title') as string,
        url: formData.get('url') as string,
    };

    await apiServer.patch<UpdateFavoritePayload>(`favorites/${id}`, payload);

    revalidatePath(`/favorites/${id}`);

    return { ok: true, message: 'Atualizado com sucesso!' };
}

/**
 * Remove um favorito.
 * Chamada diretamente (não via useActionState) pelo FavoritesDeleteButton.
 */
export async function deleteFavorite(id: string): Promise<void> {
    await apiServer.delete(`favorites/${id}`);
    revalidatePath('/favorites');
}