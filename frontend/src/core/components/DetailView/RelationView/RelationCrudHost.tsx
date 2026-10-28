"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef, flexRender, useTable } from "@tanstack/react-table";
import { appTableFeatures, type AppTableFeatures } from "@core/table-features";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { Button } from "@components/ui/button";
import { EmptyState } from "@components/ui/empty-state";
import { Trash2 } from "lucide-react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

export type RelationCrudHostProps<T extends object> = {
    columns: ColumnDef<AppTableFeatures, T>[];
    initialData?: T[];
    detach?: (id: string) => Promise<void>;
    idAccessor?: (item: T) => string;
    rowLink?: (item: T) => string | undefined;
    emptyMessage?: string;
    confirmDetachTitle?: string;
    confirmDetachDescription?: string;
};

function RelationCrudHost<T extends object>({
    columns,
    initialData = [],
    detach,
    idAccessor = (i: T) => ((i as { id?: string }).id ?? ""),
    rowLink,
    emptyMessage = "Nenhum item.",
    confirmDetachTitle = "Remover este item?",
    confirmDetachDescription,
}: RelationCrudHostProps<T>) {
    const { confirm, dialog } = useConfirmDialog();
    const [items, setItems] = React.useState<T[]>(initialData);

    // `items` diverge de `initialData` conforme attach/detach — não é um
    // simples espelho de prop, então não dá pra "derivar" direto. Re-sincroniza
    // quando `initialData` mudar de verdade (Server Component pai recarregou)
    // sem useEffect: setState durante o render é seguro aqui porque o React
    // re-renderiza antes de pintar — mesmo padrão de relation-host.tsx (ver
    // "Adjusting state based on a prop change" na doc do React).
    const [prevInitialData, setPrevInitialData] = React.useState(initialData);
    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setItems(initialData);
    }

    // TanStack Table's useTable() retorna funções que o React Compiler
    // não consegue memoizar com segurança — limitação conhecida da lib, não
    // um bug deste componente (ver https://react.dev/reference/react-compiler).
    const table = useTable({ features: appTableFeatures, data: items, columns });

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
            {items.length === 0 ? (
                <EmptyState title={emptyMessage} className="py-6" />
            ) : (
                <div className="overflow-x-auto rounded-md border">
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
                                                        <Link href={rowPath} className="font-medium text-foreground hover:underline">
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
