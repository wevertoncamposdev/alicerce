// core/components/Layout/column-builder.tsx
//
// U3 (docs/PLAN-fundacao-ux.md): transforma `ColumnConfig<T>[]`
// (core/registry/types.ts) num `ColumnDef<AppTableFeatures,T>[]` de
// verdade — cada módulo que optar por declarar coluna por tipo (em vez
// de montar `ColumnDef` cru, como `modules/*/components/columns.tsx`
// ainda fazem) ganha render consistente (badge com tom, data em
// pt-BR, dinheiro em R$...) sem repetir formatação módulo a módulo.
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { ColumnConfig } from "@core/registry/types";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import { Badge } from "@components/ui/badge";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";

const MONEY_FORMAT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function rawValue<T>(record: T, key: keyof T & string): unknown {
    return record[key];
}

/**
 * Valor em texto puro pra qualquer tipo de coluna — usado pela célula
 * (tipos simples) e por `core/registry/csv-export.ts` (CSV não tem
 * como exportar JSX). Tipos com JSX próprio (title/badge/relation/tags)
 * também passam por aqui pro texto equivalente — é o que o CSV grava.
 */
export function formatColumnText<T>(column: ColumnConfig<T>, record: T): string {
    const value = rawValue(record, column.key);
    if (value === null || value === undefined || value === "") return "";

    switch (column.type) {
        case "date":
            return new Date(String(value)).toLocaleDateString("pt-BR");
        case "datetime":
            return new Date(String(value)).toLocaleString("pt-BR");
        case "money":
            return MONEY_FORMAT.format(Number(value) / 100);
        case "badge":
            return column.enumDef.label(String(value));
        case "tags":
            return Array.isArray(value) ? value.join(", ") : String(value);
        case "count":
        case "text":
        case "title":
        case "relation":
            return String(value);
    }
}

// `T extends object`: TanStack exige `RowData = Record<string,any> |
// Array<any>` pra `ColumnDef<AppTableFeatures,T>` — sem a restrição,
// um `T` genérico solto não satisfaz isso.
export function buildColumns<T extends object>(columns: ColumnConfig<T>[]): ColumnDef<AppTableFeatures, T>[] {
    return columns.map((column): ColumnDef<AppTableFeatures, T> => {
        const base = { accessorKey: column.key as string, header: column.label };

        switch (column.type) {
            case "title":
                return {
                    ...base,
                    cell: ({ row }) => {
                        const record = row.original;
                        const name = formatColumnText(column, record);
                        const subtitle = column.subtitle ? rawValue(record, column.subtitle) : undefined;
                        return (
                            <Link href={column.href(record)} className="flex items-center gap-2.5 hover:underline">
                                {column.avatar ? (
                                    <Avatar size="sm">
                                        {column.avatar.src ? (
                                            <AvatarImage src={String(rawValue(record, column.avatar.src) ?? "")} alt="" />
                                        ) : null}
                                        <AvatarFallback>{column.avatar.fallback(record)}</AvatarFallback>
                                    </Avatar>
                                ) : null}
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium text-foreground">{name}</span>
                                    {subtitle ? (
                                        <span className="truncate text-xs text-muted-foreground">{String(subtitle)}</span>
                                    ) : null}
                                </span>
                            </Link>
                        );
                    },
                };

            case "badge":
                return {
                    ...base,
                    cell: ({ row }) => (
                        <EnumBadge enumDef={column.enumDef} value={String(rawValue(row.original, column.key) ?? "")} />
                    ),
                };

            case "relation":
                return {
                    ...base,
                    cell: ({ row }) => {
                        const record = row.original;
                        const href = column.href(record);
                        const text = formatColumnText(column, record);
                        if (!text) return <span className="text-muted-foreground">—</span>;
                        return href ? (
                            <Link href={href} className="hover:underline">{text}</Link>
                        ) : (
                            <span>{text}</span>
                        );
                    },
                };

            case "tags":
                return {
                    ...base,
                    cell: ({ row }) => {
                        const value = rawValue(row.original, column.key);
                        const tags = Array.isArray(value) ? (value as unknown[]) : [];
                        if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
                        return (
                            <div className="flex flex-wrap gap-1">
                                {tags.map((tag) => (
                                    <Badge key={String(tag)} className={STATUS_BADGE_CLASSNAME.neutral}>
                                        {String(tag)}
                                    </Badge>
                                ))}
                            </div>
                        );
                    },
                };

            case "count":
                return {
                    ...base,
                    cell: ({ row }) => (
                        <Badge className={STATUS_BADGE_CLASSNAME.neutral}>{formatColumnText(column, row.original)}</Badge>
                    ),
                };

            case "date":
            case "datetime":
            case "money":
            case "text":
                return {
                    ...base,
                    cell: ({ row }) => {
                        const text = formatColumnText(column, row.original);
                        return text || <span className="text-muted-foreground">—</span>;
                    },
                };
        }
    });
}
