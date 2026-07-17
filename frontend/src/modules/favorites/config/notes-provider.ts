'use server';

import { apiServer } from "@lib/api-server";
import type { FavoriteNote } from "@modules/favorites/types";

export async function listFavoriteNotes(favoriteId: string): Promise<FavoriteNote[]> {
    return apiServer.get<FavoriteNote[]>(`favorites/${favoriteId}/notes`);
}

export async function createFavoriteNote(favoriteId: string, content: string): Promise<FavoriteNote> {
    return apiServer.post<FavoriteNote>(`favorites/${favoriteId}/notes`, { content });
}

export async function deleteFavoriteNote(favoriteId: string, noteId: string): Promise<void> {
    await apiServer.delete(`favorites/${favoriteId}/notes/${noteId}`);
}