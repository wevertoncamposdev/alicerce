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
import { EmptyState } from "@components/ui/empty-state";
import { Button } from "@components/ui/button";
import { Trash2 } from "lucide-react";
import { RelationListHost } from "./RelationListHost";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

export type NoteRowLike = {
    id: string;
    content: string;
    createdAt: string;
    user?: { email?: string | null } | null;
};

type RelationTablePanelProps<T extends NoteRowLike> = {
    favoriteId: string;
    initialNotes: T[];
    createNoteFn: (favoriteId: string, content: string) => Promise<T>;
    deleteNoteFn: (favoriteId: string, noteId: string) => Promise<void>;
    columns?: ColumnDef<T>[];
    searchPlaceholder?: string;
    addLabel?: string;
    emptyMessage?: string;
};

const defaultColumns = <T extends NoteRowLike>(): ColumnDef<T>[] => [
    { accessorKey: "content", header: "Nota" },
    {
        accessorKey: "user.email",
        header: "Autor",
        cell: ({ row }) => row.original.user?.email ?? "—",
    },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("pt-BR"),
    },
];

export function RelationTablePanel<T extends NoteRowLike>(props: RelationTablePanelProps<T>) {
    const {
        favoriteId,
        initialNotes,
        createNoteFn,
        deleteNoteFn,
        columns: overrideColumns,
        searchPlaceholder = "Pesquisar notas",
        addLabel = "Nova nota",
        emptyMessage = "Nenhuma nota encontrada.",
    } = props;
    const [notes, setNotes] = React.useState<T[]>(initialNotes);
    const { confirm, dialog } = useConfirmDialog();
    const [searchText, setSearchText] = React.useState("");
    const [newNoteText, setNewNoteText] = React.useState("");
    const [isAdding, setIsAdding] = React.useState(false);
    const [isPending, startTransition] = useTransition();

    const filteredNotes = React.useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return notes;
        return notes.filter((note) => note.content.toLowerCase().includes(query));
    }, [notes, searchText]);

    const handleDelete = React.useCallback(
        async (noteId: string) => {
            const confirmed = await confirm({ title: "Remover esta nota?" });
            if (!confirmed) return;

            const previous = notes;
            setNotes((current) => current.filter((n) => n.id !== noteId));

            startTransition(async () => {
                try {
                    await deleteNoteFn(favoriteId, noteId);
                } catch (err) {
                    console.error("[relation-shell] falha ao remover nota", err);
                    setNotes(previous);
                }
            });
        },
        [confirm, notes, deleteNoteFn, favoriteId, startTransition],
    );

    const tableColumns = React.useMemo<ColumnDef<T>[]>(
        () => [
            ...(overrideColumns ?? defaultColumns<T>()),
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
        [overrideColumns, handleDelete],
    );

    // TanStack Table's useReactTable() retorna funções que o React Compiler
    // não consegue memoizar com segurança — limitação conhecida da lib, não
    // um bug deste componente (ver https://react.dev/reference/react-compiler).
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: filteredNotes,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    function handleCreate() {
        const content = newNoteText.trim();
        if (!content) return;

        startTransition(async () => {
            try {
                const created = await createNoteFn(favoriteId, content);
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
            searchPlaceholder={searchPlaceholder}
            filteredCount={filteredNotes.length}
            addLabel={addLabel}
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
                    <Button type="button" size="sm" variant="save" onClick={handleCreate} disabled={isPending}>
                        Salvar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                        Cancelar
                    </Button>
                </div>
            ) : null}

            {filteredNotes.length === 0 ? (
                <EmptyState title={emptyMessage} className="py-6" />
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
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {dialog}
        </RelationListHost>
    );
}