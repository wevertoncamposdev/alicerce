// @SSR

import { FavoriteCreateForm } from '@/features/favorites/components/FavoritesCreateForm';
import { FavoritesList } from '@/features/favorites/components/FavoritesList';
import { FavoriteItem } from '@/features/favorites/components/FavoritesItem';
import { Favorite } from '@/features/favorites/favorite.types';
import { getFavorites } from '@/features/favorites/server/favorites.queries';

/**
 * @alias /favorites
 * */
export default async function FavoritesPage() {
    //const favorites = await getFavorites(); // Server Component, can await directly.

    const favorites = await getFavorites(); // Server Component, can await directly.

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Favoritos</h1>
                <FavoriteCreateForm />
            </div>
            <ul>
                {favorites.map((favorite) => (
                    <FavoriteItem key={favorite.id} favorite={favorite} />
                ))}
            </ul>
        </div>
    );
}