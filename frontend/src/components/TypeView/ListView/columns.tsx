import { ColumnDef } from "@tanstack/react-table";
import { Favorite } from "@/features/favorites/favorite.types";

export const favoriteColumns: ColumnDef<Favorite>[] = [
    { accessorKey: "title", header: "Título" },
    { accessorKey: "url", header: "URL" },
    { accessorKey: "createdAt", header: "Criado em" },
];