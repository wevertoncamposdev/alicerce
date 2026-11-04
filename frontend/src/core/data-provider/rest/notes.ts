// core/data-provider/rest/notes.ts
//
// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): leitura de Notas — mesmo
// padrão de `audit.ts` (recurso polimórfico, não é um módulo com
// DataProvider padrão). `apiServer` já manda `x-tenant-id` sozinho, as
// rotas de `core/metadata` são tenant-scoped pelo backend.
import "server-only";
import { apiServer } from "@lib/api-server";
import type { NoteItem } from "@core/components/DetailView/MetaDataView/types";

export type NoteEntry = {
    id: string;
    body: string;
    pinned: boolean;
    authorId: string;
    createdAt: string;
    author: { id: string; email: string; name: string | null };
};

export function toNoteItem(entry: NoteEntry): NoteItem {
    return {
        id: entry.id,
        body: entry.body,
        authorId: entry.authorId,
        authorName: entry.author.name || entry.author.email,
        pinned: entry.pinned,
        createdAt: entry.createdAt,
    };
}

export async function listNotes(entity: string, entityId: string): Promise<NoteItem[]> {
    const entries = await apiServer.get<NoteEntry[]>("notes", { query: { entity, entityId } });
    return entries.map(toNoteItem);
}
