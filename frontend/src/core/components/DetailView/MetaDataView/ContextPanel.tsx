import * as React from "react";
import type { ContextItem } from "./types";
import { EmptyState } from "@components/ui/empty-state";

export function ContextPanel({ items }: { items: ContextItem[] }) {
    if (!items.length) {
        return <EmptyState title="Nenhum contexto disponível." className="py-4" />;
    }

    // Mesmo grid de FieldList.tsx (docs/ui/detail-page.md §3) — "tabela de campos"
    // consistente entre o Detail e o drawer de Metadados.
    return (
        <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2.5 text-sm">
            {items.map((item) => (
                <React.Fragment key={item.key}>
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd className="break-words text-foreground">{item.value}</dd>
                </React.Fragment>
            ))}
        </dl>
    );
}