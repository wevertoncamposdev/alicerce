"use client";

import { ListView } from "@/components/TypeView/ListView/ListView";
import { tenantColumns } from "@modules/tenants/components/columns";
import type { TenantEntity } from "@/modules/tenants/types/types";

export function TenantsListView({ data }: { data: TenantEntity[] }) {
    return <ListView data={data} columns={tenantColumns} detail={"/tenants"} />;
}