// components/type-view/list-view/FavoritesListView.tsx
"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { roleColumns } from "@modules/roles/components/columns"
import type { RoleEntity } from "@modules/roles/types/types";

export function RolesListView({ data }: { data: RoleEntity[] }) {
    return <ListView data={data} columns={roleColumns} detail={"/roles"} />;
}