import type { ContextItem } from "./types";
import { EmptyState } from "@components/ui/empty-state";

export function ContextPanel({ items }: { items: ContextItem[] }) {
    if (!items.length) {
        return <EmptyState title="Nenhum contexto disponível." className="py-4" />;
    }

    return (
        <div className="space-y-3 text-sm">
            {items.map((item, index) => (
                <div
                    key={item.key}
                    className={
                        index === items.length - 1
                            ? "flex items-center justify-between gap-3"
                            : "flex items-center justify-between gap-3 border-b border-border/50 pb-3"
                    }
                >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-right text-foreground">{item.value}</span>
                </div>
            ))}
        </div>
    );
}