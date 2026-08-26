import type { ColumnDef } from "@tanstack/react-table";
import type { PermissionEntity } from "@modules/permissions/types/types";

export const permissionColumns: ColumnDef<PermissionEntity>[] = [
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "type", header: "Tipo" },
    { accessorKey: "resource", header: "Recurso" },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString("pt-BR") : ""),
    },
];

export default permissionColumns;
