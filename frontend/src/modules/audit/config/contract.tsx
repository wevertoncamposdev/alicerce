import { defineRecordModule, registerModule } from "@lib/registry";
import type { ListLayout } from "@lib/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

import { AuditListView } from "@/modules/audit/components/AuditListView";
import { readAuditEntry, searchAuditEntries } from "@/modules/audit/config/provider";
import type { AuditEntry } from "@/modules/audit/types/types";

const auditListLayout: ListLayout<AuditEntry> = {
    list: ({ data }) => <AuditListView data={data} />,
};

const { parseListState, serializeListState } = createListQueryState();

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
});

registerModule(auditModule);
