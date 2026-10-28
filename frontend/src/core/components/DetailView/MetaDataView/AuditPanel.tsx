import { CalendarPlus, Clock, History } from "lucide-react";
import type { AuditFeedItem } from "./types";
import { EmptyState } from "@components/ui/empty-state";
import { Card } from "@components/ui/card";
import { formatAuditDate } from "./format";

function actionLabel(action: string) {
    switch (action) {
        case "POST": return "Criado";
        case "PATCH": return "Atualizado";
        case "DELETE": return "Removido";
        default: return action;
    }
}

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

export function AuditPanel({ items }: { items: AuditFeedItem[] }) {
    if (!items.length) {
        return <EmptyState title="Nenhum evento de auditoria registrado." className="py-4" />;
    }

    const created = oldestOf(items);
    const lastUpdated = newestOf(items);

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
            </Card>

            <Card className="p-4">
                <div className="mb-3 flex items-center gap-2 font-medium text-foreground">
                    <History className="size-4 text-muted-foreground" />
                    Histórico de alterações
                </div>
                <div className="space-y-4 border-l border-border/60 pl-4">
                    {items.map((item) => (
                        <div key={item.id} className="relative">
                            <span
                                className={`absolute top-1.5 -left-[18.5px] size-2 rounded-full ${ACTION_DOT_CLASSNAME[item.action] ?? "bg-muted-foreground"}`}
                            />
                            <div className="text-xs text-muted-foreground">{formatAuditDate(item.createdAt)}</div>
                            <div className="text-foreground">
                                {actionLabel(item.action)} <span className="text-muted-foreground">por {item.userEmail}</span>
                            </div>
                            {item.summary && item.summary !== "—" ? (
                                <div className="mt-0.5 text-xs text-muted-foreground">{item.summary}</div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
