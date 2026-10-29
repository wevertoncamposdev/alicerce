import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { RoleTypeEnum } from "@modules/roles/config/role-type-enum";
import type { RoleEntity } from "@modules/roles/types/types";

type IntlLabelFormatter = (descriptor: { id: string }) => string;

export function buildRoleColumns(formatMessage: IntlLabelFormatter): ColumnDef<AppTableFeatures, RoleEntity>[] {
    return [
        { accessorKey: "name", header: formatMessage({ id: "role.name" }) },
        {
            accessorKey: "type",
            header: formatMessage({ id: "role.type" }),
            cell: ({ row }) => <EnumBadge enumDef={RoleTypeEnum} value={row.original.type} />,
        },
        { accessorKey: "description", header: formatMessage({ id: "role.description" }) },
        {
            accessorKey: "createdAt",
            header: "Criado em",
            cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString("pt-BR") : ""),
        },
    ];
}