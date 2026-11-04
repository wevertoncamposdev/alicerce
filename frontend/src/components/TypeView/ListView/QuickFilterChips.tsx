"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";
import type { ColumnConfig } from "@core/registry/types";

// U3 (docs/PLAN-fundacao-ux.md): um grupo de chip por coluna `type:
// "badge"` — clicar escreve `filter_<key>=<valor>` na URL (mesmo
// `filters` que `SearchArgs`/`createRestDataHandlers` já mandam pro
// backend, ver core/data-provider/rest-handlers.ts — nenhum mecanismo
// novo, só a UI que faltava). Só aparece pra módulo que declarou
// `ColumnConfig` (ver ListView.tsx) — adoção incremental.
export function QuickFilterChips<T extends object>({ columns }: { columns: ColumnConfig<T>[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const badgeColumns = columns.filter(
        (column): column is Extract<ColumnConfig<T>, { type: "badge" }> => column.type === "badge",
    );
    if (badgeColumns.length === 0) return null;

    function setFilter(key: string, value: string | null) {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(`filter_${key}`, value); else params.delete(`filter_${key}`);
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex flex-wrap items-center gap-4">
            {badgeColumns.map((column) => {
                const current = searchParams.get(`filter_${column.key}`);
                return (
                    <div key={column.key} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{column.label}:</span>
                        <button
                            type="button"
                            onClick={() => setFilter(column.key, null)}
                            className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                                !current
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                        >
                            Todos
                        </button>
                        {column.enumDef.options().map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFilter(column.key, option.value)}
                                className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                                    current === option.value
                                        ? STATUS_BADGE_CLASSNAME[column.enumDef.tone(option.value)]
                                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
