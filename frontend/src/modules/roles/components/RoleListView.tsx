// components/type-view/list-view/RoleListView.tsx
"use client";

import { useIntl } from "react-intl";
import { ListView } from "@components/TypeView/ListView/ListView";
import { buildRoleColumns } from "@modules/roles/components/columns";
import type { RoleEntity } from "@modules/roles/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type RolesListViewProps = {
    data: RoleEntity[];
    pagination: SearchResult<RoleEntity>["pagination"];
    sort?: SortSpec[];
};

export function RolesListView({ data, pagination, sort }: RolesListViewProps) {
    const { formatMessage } = useIntl();
    return <ListView data={data} columns={buildRoleColumns(formatMessage)} detail="/roles" pagination={pagination} sort={sort} />;
}
