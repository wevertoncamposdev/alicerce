'use client'

import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { UserEntity } from "../types/types";

export const userColumns: ColumnDef<AppTableFeatures, UserEntity>[] = [
    {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => row.original.name ?? row.original.email,
    },
    { accessorKey: "email", header: "E-mail" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (row.original.pendingInvite ? "Convite pendente" : row.original.status),
    },
    { accessorKey: "tenantId", header: "Tenant ID" },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];