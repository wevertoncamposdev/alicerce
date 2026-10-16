// components/type-view/list-view/FavoritesListView.tsx
"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { favoriteColumns } from "@modules/favorites/components/columns";
import type { FavoriteEntity } from "@modules/favorites/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type FavoritesListViewProps = {
    data: FavoriteEntity[];
    pagination: SearchResult<FavoriteEntity>["pagination"];
    sort?: SortSpec[];
};

export function FavoritesListView({ data, pagination, sort }: FavoritesListViewProps) {
    return <ListView data={data} columns={favoriteColumns} detail={"/favorites"} pagination={pagination} sort={sort} />;
}
