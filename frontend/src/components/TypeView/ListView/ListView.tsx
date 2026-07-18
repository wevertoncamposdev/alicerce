"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
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

import { Button } from "@components/ui/button";

type Props<T> = {
    data: T[];
    columns: ColumnDef<T>[];
    detail: string;
};

export function ListView<T extends { id: string | number }>({
    data,
    columns,
    detail,
}: Props<T>) {
    const router = useRouter();

    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,

        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),

        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    if (data.length === 0) {
        return (
            <div className="py-20 text-center">
                <p className="font-medium">
                    Nenhum registro encontrado.
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                    Tente alterar sua pesquisa.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* Tabela */}
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
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

            {/* Paginação */}
            <div className="flex items-center justify-between">

                <p className="text-sm text-muted-foreground">
                    Página {table.getState().pagination.pageIndex + 1} de{" "}
                    {table.getPageCount()}
                </p>

                <div className="flex gap-2">

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-3 w-3" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-3 w-3" />
                    </Button>

                </div>

            </div>

        </div>
    );
}