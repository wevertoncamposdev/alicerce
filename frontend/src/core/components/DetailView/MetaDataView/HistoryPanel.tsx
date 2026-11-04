"use client";

import * as React from "react";
import { CalendarPlus, Clock, History } from "lucide-react";
import { EmptyState } from "@components/ui/empty-state";
import { Card } from "@components/ui/card";
import { formatAuditDate } from "./format";
import type { AuditFeedItem } from "./types";

// Timeline (docs/ui/detail-page.md §6) — bolinha colorida por ação.
const ACTION_DOT_CLASSNAME: Record<string, string> = {
    POST: "bg-emerald-500",
    PATCH: "bg-primary",
    DELETE: "bg-destructive",
};

function oldestOf(items: AuditFeedItem[]): AuditFeedItem {
    return items.reduce((oldest, item) => (new Date(item.createdAt) < new Date(oldest.createdAt) ? item : oldest));
}

function newestOf(items: AuditFeedItem[]): AuditFeedItem {
    return items.reduce((newest, item) => (new Date(item.createdAt) > new Date(newest.createdAt) ? item : newest));
}

// U6: agrupa por dia (pt-BR) — não precisa de nenhuma chamada nova ao
// backend, é só o mesmo `createdAt` já carregado, com outro corte.
function groupByDay(items: AuditFeedItem[]): { day: string; items: AuditFeedItem[] }[] {
    const groups = new Map<string, AuditFeedItem[]>();
    for (const item of items) {
        const day = new Date(item.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
        const existing = groups.get(day);
        if (existing) existing.push(item);
        else groups.set(day, [item]);
    }
    return Array.from(groups.entries()).map(([day, dayItems]) => ({ day, items: dayItems }));
}

export function HistoryPanel({ items, statusBadge }: { items: AuditFeedItem[]; statusBadge?: React.ReactNode }) {
    if (!items.length) {
        return <EmptyState title="Nenhum evento registrado." className="py-4" />;
    }

    const created = oldestOf(items);
    const lastUpdated = newestOf(items);
    const groups = groupByDay(items);

    return (
        <div className="space-y-4 text-sm">
            <Card className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                    <CalendarPlus className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                        <div className="font-medium text-foreground">Registro criado em</div>
                        <div className="text-muted-foreground">
                            {formatAuditDate(created.createdAt)} · por {created.userEmail}
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                        <div className="font-medium text-foreground">Última atualização</div>
                        <div className="text-muted-foreground">
                            {formatAuditDate(lastUpdated.createdAt)} · por {lastUpdated.userEmail}
                        </div>
                    </div>
                </div>

                {statusBadge ? (
                    <div className="flex items-start gap-3">
                        <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                            <div className="font-medium text-foreground">Situação</div>
                            <div className="text-muted-foreground">{statusBadge}</div>
                        </div>
                    </div>
                ) : null}
            </Card>

            <Card className="p-4">
                <div className="mb-3 flex items-center gap-2 font-medium text-foreground">
                    <History className="size-4 text-muted-foreground" />
                    Histórico de alterações
                </div>
                <div className="space-y-5">
                    {groups.map((group) => (
                        <div key={group.day}>
                            <div className="mb-2 text-xs font-medium text-muted-foreground">{group.day}</div>
                            <div className="space-y-4 border-l border-border/60 pl-4">
                                {group.items.map((item) => (
                                    <div key={item.id} className="relative">
                                        <span
                                            className={`absolute top-1.5 -left-[18.5px] size-2 rounded-full ${ACTION_DOT_CLASSNAME[item.action] ?? "bg-muted-foreground"}`}
                                        />
                                        <div className="text-xs text-muted-foreground">{formatAuditDate(item.createdAt)}</div>
                                        <div className="text-foreground">
                                            {item.actionText} <span className="text-muted-foreground">por {item.userEmail}</span>
                                        </div>
                                        {item.summary && item.summary !== "—" ? (
                                            <div className="mt-0.5 text-xs text-muted-foreground">{item.summary}</div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
