'use client';

import * as React from "react";
import { useTransition } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Trash2 } from "lucide-react";
import { RelationListHost } from "./RelationListHost";
import { createFavoriteNote, deleteFavoriteNote } from "@modules/favorites/config/notes-provider";
import type { FavoriteNote } from "@/modules/favorites/types/types";

type RelationTablePanelProps = {
    favoriteId: string;
    initialNotes: FavoriteNote[];
};

const columns: ColumnDef<FavoriteNote>[] = [
    { accessorKey: "content", header: "Nota" },
    { accessorKey: "user.email", header: "Autor", cell: ({ row }) => row.original.user.email },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("pt-BR"),
    },
];

export function RelationTablePanel({ favoriteId, initialNotes }: RelationTablePanelProps) {
    const [notes, setNotes] = React.useState<FavoriteNote[]>(initialNotes);
    const [searchText, setSearchText] = React.useState("");
    const [newNoteText, setNewNoteText] = React.useState("");
    const [isAdding, setIsAdding] = React.useState(false);
    const [isPending, startTransition] = useTransition();

    const filteredNotes = React.useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return notes;
        return notes.filter((note) => note.content.toLowerCase().includes(query));
    }, [notes, searchText]);

    const tableColumns = React.useMemo<ColumnDef<FavoriteNote>[]>(
        () => [
            ...columns,
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remover nota"
                        onClick={() => handleDelete(row.original.id)}
                    >
                        <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                ),
            },
        ],
        [notes],
    );

    const table = useReactTable({
        data: filteredNotes,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    function handleDelete(noteId: string) {
        const previous = notes;
        setNotes((current) => current.filter((n) => n.id !== noteId)); // otimista

        startTransition(async () => {
            try {
                await deleteFavoriteNote(favoriteId, noteId);
            } catch (err) {
                console.error("[relation-shell] falha ao remover nota", err);
                setNotes(previous); // reverte se der erro
            }
        });
    }

    function handleCreate() {
        const content = newNoteText.trim();
        if (!content) return;

        startTransition(async () => {
            try {
                const created = await createFavoriteNote(favoriteId, content);
                setNotes((current) => [created, ...current]);
                setNewNoteText("");
                setIsAdding(false);
            } catch (err) {
                console.error("[relation-shell] falha ao criar nota", err);
            }
        });
    }

    return (
        <RelationListHost
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchPlaceholder="Pesquisar notas"
            filteredCount={filteredNotes.length}
            addLabel="Nova nota"
            onAdd={() => setIsAdding(true)}
        >
            {isAdding ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                    <Input
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Escreva uma nota..."
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                    <Button type="button" size="sm" onClick={handleCreate} disabled={isPending}>
                        Salvar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                        Cancelar
                    </Button>
                </div>
            ) : null}

            {filteredNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhuma nota encontrada.
                </p>
            ) : (
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </RelationListHost>
    );
}