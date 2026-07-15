
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { AppTopbar } from "@components/layout/AppTopbar";
import { RecordListHost } from "@components/layout/RecordListHost";
import { TypeView, type TypeViewMode } from "@components/type-view/TypeView";
import { ViewSwitcher } from "@components/type-view/ViewSwitcher";

import { CardsView } from "@components/type-view/cards-view/CardsView";

import { FavoriteCreateForm } from "@modules/favorites/components/FavoritesCreateForm";
import { FavoritesGraphView } from "@modules/favorites/components/FavoritesGraphView";
import { FavoritesListView } from "@modules/favorites/components/FavoritesListView";
import type { FavoriteEntity } from "@modules/favorites/types";
import { RecordSearch } from "@components/layout/RecordSearch";

export default async function FavoritesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {

    const rawParams = await searchParams;
    const favoritesModule = getModule<FavoriteEntity>("favorites");

    const view = typeof rawParams.view === "string" ? rawParams.view : favoritesModule.defaultView;
    const mode = (favoritesModule.views.includes(view) ? view : favoritesModule.defaultView) as TypeViewMode;

    const args = favoritesModule.parseListState(rawParams);

    const dataProvider = createDataProvider();
    const result = await dataProvider.search<FavoriteEntity>("favorites", args);

    return (
        <div className="">
            <AppTopbar
                title={favoritesModule.label}
                center={
                    <RecordSearch
                        searchText={args.searchText}
                    />
                }
                actions={
                    <ViewSwitcher current={mode} />
                }
            />
            <div className="px-4 py-2 text-sm text-gray-500">
                <RecordListHost>
                    <TypeView
                        data={result.data}
                        mode={mode}
                        listView={<FavoritesListView data={result.data} />}
                        graphView={<FavoritesGraphView data={result.data} />}
                        cardsView={<CardsView data={result.data} detail="/favorites" />}
                        formView={<FavoriteCreateForm />}
                    />
                </RecordListHost>
            </div>

        </div>
    );
}