// components/DetailView/MetaDataView/format.ts
//
// Datas do drawer de metadados são sempre pt-BR (docs/ui/detail-page.md §6) — nunca ISO cru.
// `toLocaleDateString`/`toLocaleTimeString` já é o padrão usado em RelationTablePanel.tsx,
// zero dependência nova.
export function formatAuditDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";

    const datePart = date.toLocaleDateString("pt-BR");
    const timePart = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${datePart} • ${timePart}`;
}
