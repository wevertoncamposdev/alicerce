"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import { EmptyState } from "@components/ui/empty-state";
import { Trash2 } from "lucide-react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

export type RelationCrudHostProps<T> = {
    columns: ColumnDef<T>[];
    initialData?: T[];
    list?: () => Promise<T[]>;
    detach?: (id: string) => Promise<void>;
    idAccessor?: (item: T) => string;
    rowLink?: (item: T) => string | undefined;
    emptyMessage?: string;
    confirmDetachTitle?: string;
    confirmDetachDescription?: string;
};

export function RelationCrudHost<T extends object>({
    columns,
    initialData = [],
    list,
    detach,
    idAccessor = (i: T) => ((i as { id?: string }).id ?? ""),
    rowLink,
    emptyMessage = "Nenhum item.",
    confirmDetachTitle = "Remover este item?",
    confirmDetachDescription,
}: RelationCrudHostProps<T>) {
    const { confirm, dialog } = useConfirmDialog();
    const [items, setItems] = React.useState<T[]>(initialData);
    const [loading, setLoading] = React.useState(Boolean(list));

    React.useEffect(() => {
        setItems(initialData);
    }, [initialData]);

    React.useEffect(() => {
        let mounted = true;
        if (list) {
            setLoading(true);
            list().then((res) => {
                if (mounted) {
                    setItems(res);
                    setLoading(false);
                }
            });
        }
        return () => {
            mounted = false;
        };
    }, [list]);

    // TanStack Table's useReactTable() retorna funções que o React Compiler
    // não consegue memoizar com segurança — limitação conhecida da lib, não
    // um bug deste componente (ver https://react.dev/reference/react-compiler).
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({ data: items, columns, getCoreRowModel: getCoreRowModel() });

    async function handleDetach(id: string) {
        if (!detach) return;
        const confirmed = await confirm({ title: confirmDetachTitle, description: confirmDetachDescription });
        if (!confirmed) return;

        const prev = items;
        setItems((s) => s.filter((it) => idAccessor(it) !== id));
        try {
            await detach(id);
        } catch (err) {
            console.error("relation-crud detach failed", err);
            setItems(prev);
        }
    }

    return (
        <div>
            {loading ? (
                <div className="space-y-2 py-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <EmptyState title={emptyMessage} className="py-6" />
            ) : (
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map((h) => (
                                        <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                                    ))}
                                    <TableHead></TableHead>
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => {
                                const rowPath = rowLink?.(row.original);

                                return (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => {
                                            const rendered = flexRender(cell.column.columnDef.cell, cell.getContext());
                                            const isFirstCell = cell.column.getIndex() === 0;

                                            if (rowPath && isFirstCell) {
                                                return (
                                                    <TableCell key={cell.id}>
                                                        <Link href={rowPath} className="font-medium text-foreground hover:text-primary underline-offset-4 hover:underline">
                                                            {rendered}
                                                        </Link>
                                                    </TableCell>
                                                );
                                            }

                                            return <TableCell key={cell.id}>{rendered}</TableCell>;
                                        })}
                                        <TableCell>
                                            {detach ? (
                                                <Button variant="ghost" size="icon" onClick={() => handleDetach(idAccessor(row.original))}>
                                                    <Trash2 className="size-3.5 text-destructive" />
                                                </Button>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
            {dialog}
        </div>
    );
}

export default RelationCrudHost;
