import type { AuditFeedItem } from "./types";

function actionLabel(action: string) {
    switch (action) {
        case "POST": return "Criado por:";
        case "PATCH": return "Atualizado por: ";
        case "DELETE": return "Removido";
        default: return action;
    }
}

export function AuditPanel({ items }: { items: AuditFeedItem[] }) {
    if (!items.length) {
        return <div className="text-sm text-muted-foreground">Nenhum evento de auditoria registrado.</div>;
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <article key={item.id} className="space-y-1 border-b border-border/50 pb-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">
                            {actionLabel(item.action)}
                            <span className="text-xs text-muted-foreground">
                                {item.userEmail} @ {item.tenantName}
                            </span>
                        </span>

                        <span className="text-[11px] text-muted-foreground">
                            {item.createdAt.slice(0, 16).replace("T", ", ")}
                        </span>
                    </div>
                    {/* <div className="text-xs text-muted-foreground">{item.summary}</div> */}
                </article>
            ))}
        </div>
    );
}