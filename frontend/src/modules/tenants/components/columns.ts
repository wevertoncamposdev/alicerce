import type { ColumnDef } from "@tanstack/react-table";
import type { TenantEntity } from "../types/types";

export const tenantColumns: ColumnDef<TenantEntity>[] = [
    { accessorKey: "legalName", header: "Razão Social" },
    { accessorKey: "slug", header: "Slug" },
    { accessorKey: "email", header: "E-mail" },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];