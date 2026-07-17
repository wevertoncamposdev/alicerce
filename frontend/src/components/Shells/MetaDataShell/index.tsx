'use client';

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { ContextPanel } from "./ContextPanel";
import { AuditPanel } from "./AuditPanel";
import type { AuditFeedItem, ContextItem } from "./types";

type MetaDataShellProps = {
    contextItems: ContextItem[];
    auditItems?: AuditFeedItem[];
    defaultTab?: string;
    // Preparado para o futuro — hoje sempre undefined/omitido:
    comments?: { items: unknown[] };
    notes?: { value: string | null };
    tags?: { value: string[] };
    attachments?: { items: unknown[] };
};

export function MetaDataShell({
    contextItems,
    auditItems,
    defaultTab = "context",
    comments,
    notes,
    tags,
    attachments,
}: MetaDataShellProps) {
    const tabs = React.useMemo(() => {
        const list: { value: string; label: string; badge?: number; content: React.ReactNode }[] = [
            { value: "context", label: "Contexto", content: <ContextPanel items={contextItems} /> },
        ];

        if (auditItems) {
            list.push({
                value: "activity",
                label: "Auditoria",
                badge: auditItems.length || undefined,
                content: <AuditPanel items={auditItems} />,
            });
        }

        // comments / notes / tags / attachments: abas reservadas, ainda sem
        // dado real por trás (ver Fase 6, seção 2 — escopo). Quando o
        // backend correspondente existir, basta passar a prop aqui.
        void comments;
        void notes;
        void tags;
        void attachments;

        return list;
    }, [contextItems, auditItems, comments, notes, tags, attachments]);

    return (
        <Tabs defaultValue={defaultTab} className="flex h-full min-h-0 flex-col">
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