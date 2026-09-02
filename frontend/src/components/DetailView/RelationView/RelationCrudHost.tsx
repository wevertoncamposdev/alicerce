"use client";

import * as React from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { Button } from "@components/ui/button";
import { Trash2 } from "lucide-react";

export type RelationCrudHostProps<T> = {
    columns: ColumnDef<T>[];
    initialData?: T[];
    list?: () => Promise<T[]>;
    detach?: (id: string) => Promise<void>;
    create?: (payload: any) => Promise<T>;
    attach?: (payload: any) => Promise<void>;
    idAccessor?: (item: T) => string;
};

export function RelationCrudHost<T extends Record<string, any>>({
    columns,
    initialData = [],
    list,
    detach,
    attach,
    create,
    idAccessor = (i: T) => (i.id as string) ?? "",
}: RelationCrudHostProps<T>) {
    const [items, setItems] = React.useState<T[]>(initialData);
    const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        let mounted = true;
        if (list) {
            list().then((res) => {
                if (mounted) setItems(res);
            });
        }
        return () => {
            mounted = false;
        };
    }, [list]);

    const table = useReactTable({ data: items, columns, getCoreRowModel: getCoreRowModel() });

    async function handleDetach(id: string) {
        if (!detach) return;
        const prev = items;
        setItems((s) => s.filter((it) => idAccessor(it) !== id));
        setLoadingIds((l) => ({ ...l, [id]: true }));
        try {
            await detach(id);
        } catch (err) {
            console.error("relation-crud detach failed", err);
            setItems(prev);
        } finally {
            setLoadingIds((l) => {
                const copy = { ...l };
                delete copy[id];
                return copy;
            });
        }
    }

    return (
        <div>
            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum item.</p>
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
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                    <TableCell>
                                        {detach ? (
                                            <Button variant="ghost" size="icon" onClick={() => handleDetach(idAccessor(row.original))}>
                                                <Trash2 className="size-3.5 text-destructive" />
                                            </Button>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}

export default RelationCrudHost;
