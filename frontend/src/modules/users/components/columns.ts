import type { ColumnDef } from "@tanstack/react-table";
import type { UserEntity } from "../types/types";

export const userColumns: ColumnDef<UserEntity>[] = [
    { accessorKey: "email", header: "E-mail" },
    { accessorKey: "tenantId", header: "Tenant ID" },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];