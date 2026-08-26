import type { ColumnDef } from "@tanstack/react-table";
import type { RoleEntity } from "@modules/roles/types/types";

export const roleColumns: ColumnDef<RoleEntity>[] = [
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "type", header: "Tipo" },
    { accessorKey: "description", header: "Descrição" },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString("pt-BR") : ""),
    },
];