// core/data-provider/rest/tags.ts
//
// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): leitura de Tags do tenant
// (autocomplete) e das tags anexadas a um registro — mesmo padrão de
// `audit.ts`/`notes.ts`.
import "server-only";
import { apiServer } from "@lib/api-server";
import type { TagItem } from "@core/components/DetailView/MetaDataView/types";

export type TagEntry = { id: string; name: string; color: string };
export type RecordTagEntry = { id: string; tag: TagEntry };

export function toTagItem(entry: RecordTagEntry): TagItem {
    return { id: entry.id, name: entry.tag.name, color: entry.tag.color };
}

export async function searchTags(search?: string): Promise<TagEntry[]> {
    return apiServer.get<TagEntry[]>("tags", { query: { search } });
}

export async function listRecordTags(entity: string, entityId: string): Promise<TagItem[]> {
    const entries = await apiServer.get<RecordTagEntry[]>("record-tags", { query: { entity, entityId } });
    return entries.map(toTagItem);
}
