// modules/audit/config/row-view-model.ts
//
// U2 (docs/PLAN-fundacao-ux.md): `actionLabel`/`entityLabel`
// (core/registry/labels.ts) são `server-only` — não podem ser chamados
// de dentro de `AuditListView.tsx` ("use client"). A tradução acontece
// aqui, no Server Component (`AuditListSection`, em contract.tsx), e o
// resultado já pronto desce como prop — mesmo motivo de `columns.ts` por
// módulo (AGENTS.md §4.1.5), um nível acima.
import { actionLabel, entityLabel } from "@core/registry/labels";
import { resolveAuditEntityHref } from "@modules/audit/config/entity-link";
import type { AuditEntry } from "@modules/audit/types/types";

export type AuditRow = AuditEntry & {
    actionText: string;
    entityText: string;
    recordHref: string | null;
    recordShort: string | null;
    userText: string;
};

export function toAuditRow(entry: AuditEntry): AuditRow {
    const recordHref = resolveAuditEntityHref(entry.entity, entry.entityId);
    return {
        ...entry,
        actionText: actionLabel(entry.action),
        entityText: entityLabel(entry.entity),
        recordHref,
        // Truncado (8 chars, sem os traços do UUID completo) — só uma
        // referência curta pra reconhecer o registro, não o identificador
        // técnico inteiro.
        recordShort: recordHref && entry.entityId ? entry.entityId.slice(0, 8) : null,
        userText: entry.user?.name ?? entry.user?.email ?? "Usuário removido",
    };
}
