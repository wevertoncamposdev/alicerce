// components/type-view/list-view/FavoritesListView.tsx
"use client";

import { ListView } from "@components/type-view/list-view/ListView";
import { favoriteColumns } from "./columns";
import type { FavoriteEntity } from "../types";

export function FavoritesListView({ data }: { data: FavoriteEntity[] }) {
    return <ListView data={data} columns={favoriteColumns} detail={"/favorites"} />;
}