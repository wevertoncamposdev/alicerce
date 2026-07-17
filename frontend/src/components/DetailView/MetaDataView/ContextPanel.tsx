import type { ContextItem } from "./types";

export function ContextPanel({ items }: { items: ContextItem[] }) {
    if (!items.length) {
        return <div className="text-sm text-muted-foreground">Nenhum contexto disponível.</div>;
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