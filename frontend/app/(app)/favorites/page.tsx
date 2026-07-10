// Server Component — sem 'use client'
import { getFavorites } from '@/features/favorites/server/favorites.queries';
import { FavoritesCreateForm } from '@/features/favorites/components/FavoritesCreateForm';
import { FavoritesList } from '@/features/favorites/components/FavoritesList';

/**
 * Página de favoritos renderizada no servidor.
 * getFavorites() é aguardado aqui: os dados chegam prontos no HTML,
 * sem loading spinner nem token exposto ao browser.
 */
export default async function FavoritesPage() {
    const favorites = await getFavorites();

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meus Favoritos</h1>
                <p className="text-muted-foreground">Gerencie seus links salvos no sistema</p>
            </div>

            <FavoritesCreateForm />

            <FavoritesList favorites={favorites} />
        </div>
    );
}