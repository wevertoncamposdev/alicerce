import { createDataProvider } from "@/lib/data-provider";
import { TypeView, type TypeViewMode } from "@/components/type-view/TypeView";
import { CardsView } from "@/components/type-view/cards-view/CardsView";
import { FavoriteCreateForm } from "@/features/favorites/components/FavoritesCreateForm";
import { FavoritesGraphView } from "@/components/type-view/graph-view/FavoritesGraphView";
import { FavoritesListView } from "@/components/type-view/list-view/FavoritesListView";
import { ViewSwitcher } from "@/components/type-view/ViewSwitcher";
import type { FavoriteEntity } from "@/features/favorites/favorite.types";
import { AppTopbar } from "@/components/layout/AppTopbar";

export default async function FavoritesPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const { view } = await searchParams;
    const VALID_MODES: TypeViewMode[] = ["list", "cards", "text", "graph", "form"];
    const mode: TypeViewMode = VALID_MODES.includes(view as TypeViewMode)
        ? (view as TypeViewMode)
        : "list";

    const dataProvider = createDataProvider();
    const result = await dataProvider.search<FavoriteEntity>("favorites.list", {
        searchText: "",
        pagination: { pageIndex: 0, pageSize: 20 },
    });

    return (
        <div className="">
            <AppTopbar title="Favoritos" actions={<ViewSwitcher current={mode} />} />

            <TypeView
                data={result.data}
                mode={mode}
                listView={<FavoritesListView data={result.data} />}
                graphView={<FavoritesGraphView data={result.data} />}
                cardsView={<CardsView data={result.data} detail="/favorites" />}
                formView={<FavoriteCreateForm />}
            />
        </div>
    );
}