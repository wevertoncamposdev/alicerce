"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@components/ui/empty-state";
import {
    ColumnDef,
    ColumnVisibilityState,
    SortingState,
    flexRender,
    useTable,
} from "@tanstack/react-table";
import * as React from "react";

import { ArrowDown, ArrowUp } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@components/ui/table";

import { Card } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { appTableFeatures, type AppTableFeatures } from "@core/table-features";
import { buildColumns } from "@core/components/Layout/column-builder";
import { ColumnVisibilityMenu } from "@components/TypeView/ListView/ColumnVisibilityMenu";
import type { SearchResult, SortSpec } from "@core/data-provider/types";
import type { ColumnConfig } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

const { serializeListState } = createListQueryState();

// U3 (docs/PLAN-fundacao-ux.md): `columns` aceita o `ColumnDef` cru de
// sempre OU o `ColumnConfig` declarativo novo (adoção incremental,
// módulo a módulo) — só olha o primeiro item pra decidir qual é, não
// dá pra misturar os dois tipos no mesmo array.
function isColumnConfig<T extends object>(value: unknown): value is ColumnConfig<T> {
    return typeof value === "object" && value !== null && "type" in value;
}

type Props<T extends { id: string | number }> = {
    data: T[];
    columns: ColumnDef<AppTableFeatures, T>[] | ColumnConfig<T>[];
    detail: string;
    pagination: SearchResult<T>["pagination"];
    sort?: SortSpec[];
};

export function ListView<T extends { id: string | number }>({
    data,
    columns: columnsProp,
    detail,
    pagination,
    sort,
}: Props<T>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const columns =
        columnsProp.length > 0 && isColumnConfig<T>(columnsProp[0])
            ? buildColumns(columnsProp as ColumnConfig<T>[])
            : (columnsProp as ColumnDef<AppTableFeatures, T>[]);

    // Convertido direto do `sort` que chegou da URL/servidor (ver
    // SearchArgs.sort) — nunca é estado local: clicar numa coluna navega
    // pra uma nova URL (abaixo), o servidor reordena e devolve de novo.
    const sorting: SortingState = (sort ?? []).map((s) => ({ id: s.field, desc: s.direction === "desc" }));

    // U3: colunas visíveis também vêm da URL, não de estado local — só
    // grava quem está ESCONDIDO (`hiddenColumns=cpf,email`); ausente =
    // visível (ColumnVisibilityState trata `undefined` como visível,
    // só `false` explícito esconde — ver columnVisibilityFeature).
    const hiddenColumns = React.useMemo(
        () => new Set((searchParams.get("hiddenColumns") ?? "").split(",").filter(Boolean)),
        [searchParams],
    );
    const columnVisibility: ColumnVisibilityState = React.useMemo(
        () => Object.fromEntries([...hiddenColumns].map((id) => [id, false])),
        [hiddenColumns],
    );

    function navigate(patch: Parameters<typeof serializeListState>[1]) {
        const params = serializeListState(searchParams, patch);
        router.push(`${pathname}?${params.toString()}`);
    }

    // TanStack Table's useTable() retorna funções que o React Compiler
    // não consegue memoizar com segurança — limitação conhecida da lib, não
    // um bug deste componente (ver https://react.dev/reference/react-compiler).
    const table = useTable({
        features: appTableFeatures,
        data,
        columns,
        state: { sorting, columnVisibility },
        // Paginação e ordenação são 100% do servidor — `data` já chega como
        // a página pedida na URL (ver TypeViewScreen); a tabela só exibe,
        // nunca reprocessa localmente.
        manualSorting: true,
        onSortingChange: (updater) => {
            const next = typeof updater === "function" ? updater(sorting) : updater;
            const first = next[0];
            if (!first) {
                navigate({ sortField: "" });
                return;
            }
            navigate({ sortField: first.id, sortDirection: first.desc ? "desc" : "asc" });
        },
        // `columnVisibility` não é estado local do TanStack aqui (ver
        // `hiddenColumns` acima) — todo toggle (um checkbox ou "mostrar
        // tudo") vira uma navegação só, com o diff inteiro já aplicado.
        onColumnVisibilityChange: (updater) => {
            const next = typeof updater === "function" ? updater(columnVisibility) : updater;
            const nextHidden = new Set(hiddenColumns);
            for (const column of table.getAllLeafColumns()) {
                if (next[column.id] === false) nextHidden.add(column.id); else nextHidden.delete(column.id);
            }
            const params = new URLSearchParams(searchParams);
            if (nextHidden.size === 0) params.delete("hiddenColumns"); else params.set("hiddenColumns", [...nextHidden].join(","));
            router.push(`${pathname}?${params.toString()}`);
        },
    });

    if (data.length === 0) {
        return <EmptyState title="Nenhum registro encontrado." description="Tente alterar sua pesquisa." className="py-20" />;
    }

    const canPreviousPage = pagination.page > 1;
    const canNextPage = pagination.page < pagination.pages;

    return (
        <div className="space-y-4">

            {/* U3: fica aqui (dentro do client component que tem o `table`
                de verdade), não no AppTopbar (TypeViewScreen é Server
                Component — não dá pra controlar o state do useTable de lá
                sem subir tudo pela URL duas vezes). */}
            <div className="flex justify-end">
                <ColumnVisibilityMenu table={table} />
            </div>

            {/* Tabela — mesmo "outline" (Card) usado em RelationCard/SectionCard.
                `overflow-x-auto` aqui, não na página: lista com muitas colunas
                rola só dentro do card, nunca empurra o layout inteiro pros
                lados (U3 — critério de aceite do smoke a 375px). */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/30">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>

                                    {headerGroup.headers.map((header, index) => (
                                        <TableHead
                                            key={header.id}
                                            onClick={header.column.getToggleSortingHandler()}
                                            className={`cursor-pointer select-none ${index === 0 ? "sticky left-0 z-20 bg-muted/30" : ""}`}
                                        >
                                            <div className="flex items-center gap-2">

                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}

                                                {header.column.getIsSorted() === "asc" && (
                                                    <ArrowUp className="h-3 w-3" />
                                                )}

                                                {header.column.getIsSorted() === "desc" && (
                                                    <ArrowDown className="h-3 w-3" />
                                                )}

                                            </div>
                                        </TableHead>
                                    ))}

                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody>

                            {table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() =>
                                        router.push(
                                            `${detail}/${row.original.id}`
                                        )
                                    }
                                >
                                    {row.getVisibleCells().map((cell, index) => (
                                        <TableCell
                                            key={cell.id}
                                            className={`max-w-[300px] truncate ${index === 0 ? "sticky left-0 z-[5] bg-background" : ""}`}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}

                        </TableBody>

                    </Table>
                </div>
            </Card>

            {/* Paginação — sempre do servidor (SearchResult.pagination), nunca recalculada localmente */}
            <div className="flex items-center justify-between">

                <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de{" "}
                    {pagination.pages} ({pagination.total} registro(s))
                </p>

                <div className="flex gap-2">

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ pageIndex: pagination.page - 2 })}
                        disabled={!canPreviousPage}
                    >
                        <ChevronLeft className="h-3 w-3" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ pageIndex: pagination.page })}
                        disabled={!canNextPage}
                    >
                        <ChevronRight className="h-3 w-3" />
                    </Button>

                </div>

            </div>

        </div>
    );
}
