// modules/develop/demo/_shared/metadata-fixtures.ts
//
// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): dado fixo em memória pras
// quatro abas do drawer de metadados — mesmo papel de `loadAudit` no
// showcase (bypassa o REST real, só prova a UI). A demo nunca chama o
// backend de notas/tags/anexos: nenhum desses módulos tem permissão de
// catálogo de verdade (U1 já deixa isso explícito nos outros contratos),
// então `entity.update` nunca resolveria nada real mesmo que tentasse.
import type {
    NoteItem,
    TagItem,
    AttachmentItem,
    AuditFeedItem,
} from "@core/components/DetailView/MetaDataView/types";

export function buildDemoMetadata(recordLabel: string, createdAt: string) {
    const notes: NoteItem[] = [
        {
            id: "demo-note-1",
            body: `Observação inicial sobre ${recordLabel}.`,
            authorId: "demo-user-1",
            authorName: "Ana Souza",
            pinned: true,
            createdAt,
        },
        {
            id: "demo-note-2",
            body: "Acompanhar na próxima reunião da equipe.",
            authorId: "demo-user-2",
            authorName: "Weverton Campos",
            pinned: false,
            createdAt,
        },
    ];

    const tags: TagItem[] = [
        { id: "demo-tag-1", name: "Prioridade", color: "danger" },
        { id: "demo-tag-2", name: "Revisado", color: "success" },
    ];

    const attachments: AttachmentItem[] = [
        {
            id: "demo-file-1",
            name: "documento.pdf",
            mime: "application/pdf",
            size: 128_000,
            createdAt,
            contentHref: "#",
        },
    ];

    const audit: AuditFeedItem[] = [
        {
            id: "demo-audit-1",
            action: "POST",
            actionText: "Criou",
            createdAt,
            userEmail: "ana.souza@exemplo.com",
            tenantName: "Tenant Exemplo",
            summary: "Registro criado",
        },
        {
            id: "demo-audit-2",
            action: "PATCH",
            actionText: "Alterou",
            createdAt,
            userEmail: "weverton.campos@exemplo.com",
            tenantName: "Tenant Exemplo",
            summary: `Atualização de ${recordLabel}`,
        },
    ];

    return { notes, tags, attachments, audit };
}
