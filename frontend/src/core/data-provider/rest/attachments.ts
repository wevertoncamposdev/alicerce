// core/data-provider/rest/attachments.ts
//
// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): leitura de Anexos — lista
// `File` por dono (`core/files` estendido, `ownerType` = `entity`). URL
// de conteúdo same-origin via proxy BFF, mesmo padrão de avatar/logo (D6,
// `backend/src/core/files/file.service.ts#buildFileContentUrl`).
import "server-only";
import { apiServer } from "@lib/api-server";
import type { AttachmentItem } from "@core/components/DetailView/MetaDataView/types";

export type FileEntry = {
    id: string;
    mime: string;
    size: number;
    originalName: string | null;
    createdAt: string;
};

function fallbackName(mime: string): string {
    const subtype = mime.split("/")[1] ?? mime;
    return `Arquivo.${subtype}`;
}

export function toAttachmentItem(entry: FileEntry): AttachmentItem {
    return {
        id: entry.id,
        name: entry.originalName || fallbackName(entry.mime),
        mime: entry.mime,
        size: entry.size,
        createdAt: entry.createdAt,
        contentHref: `/api/proxy/files/${entry.id}/content`,
    };
}

export async function listAttachments(entity: string, entityId: string): Promise<AttachmentItem[]> {
    const entries = await apiServer.get<FileEntry[]>("files", { query: { ownerType: entity, ownerId: entityId } });
    return entries.map(toAttachmentItem);
}
