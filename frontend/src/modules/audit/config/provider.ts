import { apiServer } from "@lib/api-server";
import { getSessionTenantId } from "@lib/session";
import type { SearchArgs, SearchResult } from "@core/data-provider/types";

import type { AuditEntry } from "@modules/audit/types/types";

type AuditSearchResponse = { items: AuditEntry[]; total: number; page: number; limit: number };

function stringFilter(filters: SearchArgs["filters"], key: string): string | undefined {
    const value = filters?.[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function searchAuditEntries(args: SearchArgs): Promise<SearchResult<AuditEntry>> {
    const tenantId = await getSessionTenantId();

    if (!tenantId) {
        return { data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };
    }

    // `entity`/`entityId`/`userId`/`from`/`to` são campos dedicados do
    // SearchAuditDto (período não cabe no whitelist genérico de igualdade);
    // `type` continua indo pelo whitelist genérico (`filters`), igual antes.
    const type = stringFilter(args.filters, "type");
    const response = await apiServer.search<AuditSearchResponse>(`tenant/${tenantId}/audit`, {
        searchText: args.searchText,
        sort: args.sort,
        pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
        entity: stringFilter(args.filters, "entity"),
        entityId: stringFilter(args.filters, "entityId"),
        userId: stringFilter(args.filters, "userId"),
        from: stringFilter(args.filters, "from"),
        to: stringFilter(args.filters, "to"),
        filters: type ? { type } : undefined,
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

export type AuditUserOption = { id: string; label: string };

// Alimenta o filtro "Usuário" da lista de auditoria (8.5) — texto puro ou
// um <select> de id bruto seriam uma UX ruim, então resolve nome/e-mail de
// cada usuário do tenant. Nunca derruba a tela: quem só tem `audit.read`
// (sem `user.read`) ainda consegue ver a auditoria, só sem esse filtro.
export async function listAuditUserOptions(): Promise<AuditUserOption[]> {
    try {
        const response = await apiServer.search<{
            items: Array<{ id: string; email: string; name?: string | null }>;
        }>("user", {
            pagination: { pageIndex: 0, pageSize: 200 },
        });

        return response.items
            .map((user) => ({ id: user.id, label: user.name ?? user.email }))
            .sort((a, b) => a.label.localeCompare(b.label));
    } catch {
        return [];
    }
}
