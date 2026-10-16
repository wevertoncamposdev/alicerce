'use server';

import { apiServer } from "@lib/api-server";
import type { FavoriteNote } from "@modules/favorites/types/types";

// backend renomeou favorites -> examples (PLAN.md, Etapa 7.D); rename
// completo do módulo no frontend (nomes de função/arquivo) fica pra 7.F.
export async function listFavoriteNotes(favoriteId: string): Promise<FavoriteNote[]> {
    return apiServer.get<FavoriteNote[]>(`examples/${favoriteId}/notes`);
}

export async function createFavoriteNote(favoriteId: string, content: string): Promise<FavoriteNote> {
    return apiServer.post<FavoriteNote>(`examples/${favoriteId}/notes`, { content });
}

export async function deleteFavoriteNote(favoriteId: string, noteId: string): Promise<void> {
    await apiServer.delete(`examples/${favoriteId}/notes/${noteId}`);
}