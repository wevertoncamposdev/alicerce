// components/type-view/list-view/TenantsListView.tsx
"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { tenantColumns } from "@modules/tenants/components/columns"
import type { TenantEntity } from "@modules/tenants/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type TenantsListViewProps = {
    data: TenantEntity[];
    pagination: SearchResult<TenantEntity>["pagination"];
    sort?: SortSpec[];
};

export function TenantsListView({ data, pagination, sort }: TenantsListViewProps) {
    return <ListView data={data} columns={tenantColumns} detail={"/tenants"} pagination={pagination} sort={sort} />;
}
