// components/type-view/list-view/FavoritesListView.tsx
"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { favoriteColumns } from "@modules/favorites/components/columns";
import type { FavoriteEntity } from "@modules/favorites/types/types";

export function FavoritesListView({ data }: { data: FavoriteEntity[] }) {
    return <ListView data={data} columns={favoriteColumns} detail={"/favorites"} />;
}