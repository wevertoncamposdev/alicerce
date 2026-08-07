import type { ColumnDef } from "@tanstack/react-table";
import type { FavoriteEntity } from "@/modules/favorites/types/types";

export const favoriteColumns: ColumnDef<FavoriteEntity>[] = [
    {
        accessorKey: "title",
        header: "Título",
    },
    {
        accessorKey: "url",
        header: "URL",
    },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];