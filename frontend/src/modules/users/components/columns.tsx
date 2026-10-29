'use client'

import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import { Badge } from "@components/ui/badge";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { UserStatusEnum } from "./UserStatusBadge";
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
        cell: ({ row }) =>
            row.original.pendingInvite ? (
                <Badge className={STATUS_BADGE_CLASSNAME.warning}>Convite pendente</Badge>
            ) : (
                <EnumBadge enumDef={UserStatusEnum} value={row.original.status} />
            ),
    },
    // `tenantId` fica (U3 remove colunas técnicas das listas, não a U2).
    { accessorKey: "tenantId", header: "Tenant ID" },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];