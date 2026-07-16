import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { FormView } from "@components/type-view/form-view/FormView";
import type { UpdateFavoritePayload, FavoriteEntity } from "@modules/favorites/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FavoriteDetailPage({ params }: PageProps) {
    const { id } = await params;

    const favoritesModule = getModule<FavoriteEntity>("favorites");
    const dataProvider = createDataProvider();
    const favorite = await dataProvider.read<FavoriteEntity>("favorites", id);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Detalhes do Favorito: {favorite.title}
                </h1>
            </div>
            <FormView<FavoriteEntity>
                mode="edit"
                model="favorites"
                recordId={favorite.id}
                fields={favoritesModule.formFields}
                initialValues={favorite}
            />
        </div>
    );
}