"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@components/ui/empty-state";
import {
    ColumnDef,
    SortingState,
    flexRender,
    useTable,
} from "@tanstack/react-table";

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
import type { SearchResult, SortSpec } from "@core/data-provider/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

const { serializeListState } = createListQueryState();

type Props<T extends { id: string | number }> = {
    data: T[];
    columns: ColumnDef<AppTableFeatures, T>[];
    detail: string;
    pagination: SearchResult<T>["pagination"];
    sort?: SortSpec[];
};

export function ListView<T extends { id: string | number }>({
    data,
    columns,
    detail,
    pagination,
    sort,
}: Props<T>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Convertido direto do `sort` que chegou da URL/servidor (ver
    // SearchArgs.sort) — nunca é estado local: clicar numa coluna navega
    // pra uma nova URL (abaixo), o servidor reordena e devolve de novo.
    const sorting: SortingState = (sort ?? []).map((s) => ({ id: s.field, desc: s.direction === "desc" }));

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
        state: { sorting },
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
    });

    if (data.length === 0) {
        return <EmptyState title="Nenhum registro encontrado." description="Tente alterar sua pesquisa." className="py-20" />;
    }

    const canPreviousPage = pagination.page > 1;
    const canNextPage = pagination.page < pagination.pages;

    return (
        <div className="space-y-4">

            {/* Tabela — mesmo "outline" (Card) usado em RelationCard/SectionCard. */}
            <Card className="p-0">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/30">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>

                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className="cursor-pointer select-none"
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
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className="max-w-[300px] truncate"
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
