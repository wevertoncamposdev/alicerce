'use client';

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { NotesPanel } from "./NotesPanel";
import { TagsPanel } from "./TagsPanel";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { HistoryPanel } from "./HistoryPanel";
import type { AuditFeedItem, ContextItem, NoteItem, TagItem, AttachmentItem } from "./types";

type MetaDataViewProps = {
    /** `entity` do catálogo de permissões (ex. "feedback") — Notas/Tags/Anexos herdam a permissão dele. */
    entity: string;
    entityId: string;
    /** @deprecated U6: a aba Contexto saiu do drawer — ver `core/registry/types.ts#DetailConfig`. */
    contextItems: ContextItem[];
    auditItems?: AuditFeedItem[];
    /** Terceira linha do resumo do Histórico (reaproveita `header().status` do módulo). */
    historyStatus?: React.ReactNode;
    notes?: NoteItem[];
    tags?: TagItem[];
    attachments?: AttachmentItem[];
    defaultTab?: string;
};

// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): ordem fixa Notas → Tags →
// Anexos → Histórico — "a aba Contexto sai" (`contextItems` fica só pra
// módulo que ainda não migrou pra `metadata`, sem renderizar nada aqui).
export function MetaDataView({
    entity,
    entityId,
    contextItems,
    auditItems,
    historyStatus,
    notes,
    tags,
    attachments,
    defaultTab,
}: MetaDataViewProps) {
    void contextItems;

    const tabs = React.useMemo(() => {
        const list: { value: string; label: string; badge?: number; content: React.ReactNode }[] = [];

        if (notes) {
            list.push({
                value: "notes",
                label: "Notas",
                badge: notes.length || undefined,
                content: <NotesPanel entity={entity} entityId={entityId} initialNotes={notes} />,
            });
        }

        if (tags) {
            list.push({
                value: "tags",
                label: "Tags",
                badge: tags.length || undefined,
                content: <TagsPanel entity={entity} entityId={entityId} initialTags={tags} />,
            });
        }

        if (attachments) {
            list.push({
                value: "attachments",
                label: "Anexos",
                badge: attachments.length || undefined,
                content: <AttachmentsPanel entity={entity} entityId={entityId} initialAttachments={attachments} />,
            });
        }

        if (auditItems) {
            list.push({
                value: "history",
                label: "Histórico",
                content: <HistoryPanel items={auditItems} statusBadge={historyStatus} />,
            });
        }

        return list;
    }, [entity, entityId, notes, tags, attachments, auditItems, historyStatus]);

    if (tabs.length === 0) return null;

    const resolvedDefaultTab = defaultTab ?? tabs[0].value;

    return (
        <Tabs defaultValue={resolvedDefaultTab} className="flex h-full min-h-0 flex-col">
            <TabsList variant="line" className="w-full justify-start border-b">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                        {tab.badge ? (
                            <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                                ({tab.badge})
                            </span>
                        ) : null}
                    </TabsTrigger>
                ))}
            </TabsList>

            {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4 min-h-0 flex-1 overflow-y-auto">
                    {tab.content}
                </TabsContent>
            ))}
        </Tabs>
    );
}
