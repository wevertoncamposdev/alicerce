// components/type-view/list-view/FavoritesListView.tsx
"use client";

import { ListView } from "@components/type-view/list-view/ListView";
import { favoriteColumns } from "@modules/favorites/components/columns";
import type { FavoriteEntity } from "@modules/favorites/types";

export function FavoritesListView({ data }: { data: FavoriteEntity[] }) {
    return <ListView data={data} columns={favoriteColumns} detail={"/favorites"} />;
}