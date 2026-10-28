'use client';

import * as React from "react";
import { Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { Card } from "@components/ui/card";
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
                    <div className="space-y-4">
                        <AuditPanel items={auditItems} />
                        <Card className="p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                                <Info className="size-4 text-muted-foreground" />
                                Informações adicionais
                            </div>
                            <ContextPanel items={contextItems} />
                        </Card>
                    </div>
                ),
            });
        }

        list.push({
            value: "context",
            label: "Contexto",
            content: (
                <Card className="p-4">
                    <ContextPanel items={contextItems} />
                </Card>
            ),
        });

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