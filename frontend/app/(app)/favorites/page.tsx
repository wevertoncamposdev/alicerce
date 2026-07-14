import { createDataProvider } from "@/lib/data-provider";
import type { FavoriteEntity } from "@/features/favorites/favorite.types";
import { FavoriteItem } from "@/features/favorites/components/FavoritesItem";
import { FavoriteCharts } from "@/features/favorites/components/FavoriteCharts";
import { FavoriteCreateForm } from "@/features/favorites/components/FavoritesCreateForm";
import { Separator } from "@/components/ui/separator";




export default async function FavoritesPage() {
    const dataProvider = createDataProvider();

    const result = await dataProvider.search<FavoriteEntity>("favorites.list", {
        searchText: "",
        pagination: { pageIndex: 0, pageSize: 20 },
    });

    return (
        <div className="p-4">

            <h1 className="text-2xl font-bold mb-4">Favoritos</h1>
            <p>Exemplo de página de favoritos. Aqui você pode listar, criar, atualizar e deletar favoritos.</p>

            <FavoriteCreateForm />

            <Separator className="my-4" />

            {result.data.map((favorite) => (
                <FavoriteItem key={favorite.id} favorite={favorite} />
            ))}

            <Separator className="my-4" />


            <FavoriteCharts favorites={result.data} />
        </div>
    );
}