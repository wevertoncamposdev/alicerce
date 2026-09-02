import { apiServer } from "@lib/api-server";
import { getSessionTenantId } from "@lib/session";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";

import type { AuditEntry } from "@/modules/audit/types/types";

export async function searchAuditEntries(args: SearchArgs): Promise<SearchResult<AuditEntry>> {
    const tenantId = await getSessionTenantId();

    if (!tenantId) {
        return { data: [], pagination: { total: 0, page: 0, limit: 20, pages: 0 } };
    }

    const entity = typeof args.filters?.entity === "string" ? args.filters.entity : undefined;
    const entityId = typeof args.filters?.entityId === "string" ? args.filters.entityId : undefined;

    const items = await apiServer.get<AuditEntry[]>(`tenant/${tenantId}/audit`, {
        query: {
            entity,
            entityId,
        },
    });

    const pageSize = args.pagination?.pageSize ?? (items.length || 20);

    return {
        data: items,
        pagination: {
            total: items.length,
            page: args.pagination?.pageIndex ?? 0,
            limit: pageSize,
            pages: Math.max(1, Math.ceil(items.length / pageSize)),
        },
    };
}

export async function readAuditEntry(id: string): Promise<AuditEntry> {
    const tenantId = await getSessionTenantId();

    if (!tenantId) {
        throw new Error("Tenant não identificado para consultar auditoria.");
    }

    const items = await apiServer.get<AuditEntry[]>(`tenant/${tenantId}/audit`);
    const item = items.find((entry) => entry.id === id);

    if (!item) {
        throw new Error(`Registro de auditoria não encontrado: ${id}`);
    }

    return item;
}
