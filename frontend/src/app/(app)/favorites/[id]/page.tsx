import { FavoriteUpdateForm } from '@/features/favorites/components/FavoriteUpdateForm';
import { Favorite } from '@/features/favorites/favorite.types';
import { getFavorite } from '@/features/favorites/server/favorites.queries';

interface PageProps {
    params: Promise<{ id: string }>;
};

export default async function FavoriteDetailPage({ params }: PageProps) {
    const { id } = await params;
    const favorite = await getFavorite(id);
    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Detalhes do Favorito: {favorite.title}</h1>
            </div>
            <div>
                <FavoriteUpdateForm favorite={favorite} />
            </div>
        </div>
    );
}