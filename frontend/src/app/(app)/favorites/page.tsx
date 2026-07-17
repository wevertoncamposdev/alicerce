
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { AppTopbar } from "@/components/Layout/AppTopbar";
import { RecordListHost } from "@/components/Layout/RecordListHost";
import { TypeView, type TypeViewMode } from "@/components/Type-View/TypeView";
import { ViewSwitcher } from "@/components/Type-View/ViewSwitcher";

import { CardsView } from "@/components/Type-View/CardsView/CardsView";

import { FavoritesGraphView } from "@modules/favorites/components/FavoritesGraphView";
import { FavoritesListView } from "@modules/favorites/components/FavoritesListView";
import type { FavoriteEntity, CreateFavoritePayload } from "@/modules/favorites/types/types";
import { RecordSearch } from "@/components/Layout/RecordSearch";
import { FormView } from "@/components/Type-View/FormView/FormView";
import { createFavorite } from "@/modules/favorites/actions/actions";

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
                        formView={
                            <FormView<FavoriteEntity>
                                mode="create"
                                fields={favoritesModule.formFields}
                                createAction={createFavorite}
                            />
                        }
                    />
                </RecordListHost>
            </div>

        </div>
    );
}