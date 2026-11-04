export type ContextItem = {
    key: string;
    label: string;
    value: string;
};

export type AuditFeedItem = {
    id: string;
    /** Verbo HTTP cru — só pra escolher a cor da bolinha da timeline. */
    action: string;
    /**
     * Ação já em português (U2, `actionLabel`) — humanizada no servidor
     * (`DetailViewScreen.tsx`/fixture) porque `core/registry/labels.ts` é
     * `server-only` e o `HistoryPanel` roda no client (agrupa por dia,
     * sem chamada nova ao backend).
     */
    actionText: string;
    createdAt: string;
    userEmail: string;
    tenantName: string;
    /** Resumo já humanizado (campo em português via `fieldLabel`, U2). */
    summary: string;
};

// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): Notas/Tags/Anexos do drawer —
// mesmo mecanismo polimórfico do backend (`core/metadata`, `core/files`),
// mapeado pro formato que os paineis novos consomem.
export type NoteItem = {
    id: string;
    body: string;
    authorId: string;
    authorName: string;
    pinned: boolean;
    createdAt: string;
};

export type TagItem = {
    /** Id do `RecordTag` (pivô) — usado pra desanexar. */
    id: string;
    name: string;
    color: string;
};

export type AttachmentItem = {
    id: string;
    name: string;
    mime: string;
    size: number;
    createdAt: string;
    contentHref: string;
};