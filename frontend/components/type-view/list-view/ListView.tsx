"use client";

import { useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown } from "lucide-react";
import Link from 'next/link';

export function ListView<T extends { id: string | number }>({
    data,
    columns,
    detail,
}: {
    data: T[];
    columns: ColumnDef<T>[];
    detail: string;
}) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (data.length === 0) {
        return <p className="text-sm text-muted-foreground p-4">Nenhum item encontrado.</p>;
    }

    return (
        <table className="w-full border-collapse text-sm">
            <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b">
                        {headerGroup.headers.map((header) => (
                            <th
                                key={header.id}
                                onClick={header.column.getToggleSortingHandler()}
                                className="text-left p-2 cursor-pointer select-none font-medium"
                            >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {{ asc: <ArrowUp className="w-3 h-3" />, desc: <ArrowDown className="w-3 h-3" /> }[header.column.getIsSorted() as string] ?? ""}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody>
                {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-2">
                                <Link href={`${detail}/${row.original.id}`}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </Link>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}