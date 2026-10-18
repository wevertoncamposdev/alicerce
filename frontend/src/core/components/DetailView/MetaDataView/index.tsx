'use client';

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { ContextPanel } from "./ContextPanel";
import { AuditPanel } from "./AuditPanel";
import type { AuditFeedItem, ContextItem } from "./types";

type MetaDataViewProps = {
    contextItems: ContextItem[];
    auditItems?: AuditFeedItem[];
    defaultTab?: string;
    // Preparado para o futuro — hoje sempre undefined/omitido:
    comments?: { items: unknown[] };
    notes?: { value: string | null };
    tags?: { value: string[] };
    attachments?: { items: unknown[] };
};

export function MetaDataView({
    contextItems,
    auditItems,
    defaultTab,
    comments,
    notes,
    tags,
    attachments,
}: MetaDataViewProps) {
    const tabs = React.useMemo(() => {
        const list: { value: string; label: string; badge?: number; content: React.ReactNode }[] = [];

        // Auditoria vem primeiro — docs/ui/detail-page.md §6: é a aba default do drawer.
        if (auditItems) {
            list.push({
                value: "activity",
                label: "Auditoria",
                badge: auditItems.length || undefined,
                content: (
                    <div className="space-y-6">
                        <AuditPanel items={auditItems} />
                        <div className="space-y-3">
                            <div className="text-sm font-medium text-foreground">Informações adicionais</div>
                            <ContextPanel items={contextItems} />
                        </div>
                    </div>
                ),
            });
        }

        list.push({ value: "context", label: "Contexto", content: <ContextPanel items={contextItems} /> });

        // comments / notes / tags / attachments: abas reservadas, ainda sem
        // dado real por trás (ver Fase 6, seção 2 — escopo). Quando o
        // backend correspondente existir, basta passar a prop aqui.
        void comments;
        void notes;
        void tags;
        void attachments;

        return list;
    }, [contextItems, auditItems, comments, notes, tags, attachments]);

    const resolvedDefaultTab = defaultTab ?? (auditItems ? "activity" : "context");

    return (
        <Tabs defaultValue={resolvedDefaultTab} className="flex h-full min-h-0 flex-col">
            <TabsList className="border-b border-border/60">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                        {tab.badge ? (
                            <span className="ml-2 text-[11px] font-medium tabular-nums text-muted-foreground">
                                {tab.badge}
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