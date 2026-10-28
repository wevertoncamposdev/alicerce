import { FileText } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import type { SearchArgs, SearchResult } from "@core/data-provider/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

import { AuditListView } from "@modules/audit/components/AuditListView";
import { AuditDiffView } from "@modules/audit/components/AuditDiffView";
import { readAuditEntry, searchAuditEntries, listAuditUserOptions } from "@modules/audit/config/provider";
import type { AuditEntry } from "@modules/audit/types/types";
import type { ContextItem } from "@core/components/DetailView/MetaDataView/types";
import { resolveAuditEntityHref } from "@modules/audit/config/entity-link";

const { parseListState: parseBaseListState, serializeListState } = createListQueryState();

// Filtros extras (usuário/entidade/tipo/período) não cabem na factory
// genérica (só cobre searchText/pagination/sort) — lidos aqui direto da
// URL e embutidos em `filters`, que o provider.ts repassa pro backend.
function parseListState(searchParams: Record<string, string | string[] | undefined>): SearchArgs {
    const base = parseBaseListState(searchParams);
    const filters: Record<string, unknown> = {};
    for (const key of ["userId", "entity", "type", "from", "to"] as const) {
        const value = searchParams[key];
        if (typeof value === "string" && value.length > 0) filters[key] = value;
    }
    return { ...base, filters };
}

const auditListLayout: ListLayout<AuditEntry> = {
    list: ({ data, pagination }) => <AuditListSection data={data} pagination={pagination} />,
};

async function AuditListSection({
    data,
    pagination,
}: {
    data: AuditEntry[];
    pagination: SearchResult<AuditEntry>["pagination"];
}) {
    const users = await listAuditUserOptions();
    return <AuditListView data={data} pagination={pagination} users={users} />;
}

function loadAuditContext(record: AuditEntry): ContextItem[] {
    return [
        { key: "tenant", label: "Tenant", value: record.tenant?.legalName ?? "" },
        { key: "type", label: "Tipo", value: record.type ?? "" },
    ];
}

const auditDetailLayout: DetailLayout<AuditEntry> = {
    header: ({ record }) => ({
        title: `${record.action} ${record.entity}`,
        subtitle: [
            record.user?.name ?? record.user?.email ?? record.userId,
            new Date(record.createdAt).toLocaleString("pt-BR"),
        ],
    }),
    sections: [
        {
            key: "detalhes",
            title: "Detalhes",
            icon: FileText,
            column: 1,
            render: ({ record }) => {
                const href = resolveAuditEntityHref(record.entity, record.entityId);
                return (
                    <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2.5 text-sm">
                        <dt className="text-muted-foreground">Ação</dt>
                        <dd className="text-foreground">{record.action}</dd>
                        <dt className="text-muted-foreground">Entidade</dt>
                        <dd className="text-foreground">{record.entity}</dd>
                        <dt className="text-muted-foreground">Registro afetado</dt>
                        <dd className="text-foreground">
                            {record.entityId ? (
                                href ? (
                                    <a href={href} className="hover:underline">{record.entityId}</a>
                                ) : (
                                    record.entityId
                                )
                            ) : "—"}
                        </dd>
                    </dl>
                );
            },
        },
        {
            key: "diff",
            title: "Alterações",
            icon: FileText,
            column: 1,
            render: ({ record }) => <AuditDiffView before={record.before} after={record.after} />,
        },
    ],
};

export const auditModule = defineRecordModule<AuditEntry>({
    model: "audit",
    label: "Auditoria",
    views: ["list"],
    defaultView: "list",
    dataHandlers: {
        search: searchAuditEntries,
        read: readAuditEntry,
    },
    formFields: [],
    parseListState,
    serializeListState,
    listLayout: auditListLayout,
    detailLayout: auditDetailLayout,
    detailConfig: { loadContext: loadAuditContext },
});

registerModule(auditModule);
