// components/type-view/list-view/FavoritesListView.tsx
"use client";

import { useIntl } from "react-intl";
import { ListView } from "@components/TypeView/ListView/ListView";
import { buildRoleColumns } from "@modules/roles/components/columns";
import type { RoleEntity } from "@modules/roles/types/types";

export function RolesListView({ data }: { data: RoleEntity[] }) {
    const { formatMessage } = useIntl();
    return <ListView data={data} columns={buildRoleColumns(formatMessage)} detail="/roles" />;
}