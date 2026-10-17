import { apiServer } from "@lib/api-server";
import { getSessionTenantId } from "@lib/session";
import type { SearchArgs, SearchResult } from "@core/data-provider/types";

import type { AuditEntry } from "@modules/audit/types/types";

type AuditSearchResponse = { items: AuditEntry[]; total: number; page: number; limit: number };

export async function searchAuditEntries(args: SearchArgs): Promise<SearchResult<AuditEntry>> {
    const tenantId = await getSessionTenantId();

    if (!tenantId) {
        return { data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };
    }

    const entity = typeof args.filters?.entity === "string" ? args.filters.entity : undefined;
    const entityId = typeof args.filters?.entityId === "string" ? args.filters.entityId : undefined;

    const response = await apiServer.search<AuditSearchResponse>(`tenant/${tenantId}/audit`, {
        searchText: args.searchText,
        sort: args.sort,
        pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
        entity,
        entityId,
    });

    return {
        data: response.items,
        pagination: {
            total: response.total,
            page: response.page,
            limit: response.limit,
            pages: Math.ceil(response.total / response.limit),
        },
    };
}

export async function readAuditEntry(id: string): Promise<AuditEntry> {
    const tenantId = await getSessionTenantId();

    if (!tenantId) {
        throw new Error("Tenant não identificado para consultar auditoria.");
    }

    return apiServer.get<AuditEntry>(`tenant/${tenantId}/audit/${id}`);
}
