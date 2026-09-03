import type { ColumnDef } from "@tanstack/react-table";
import type { RoleEntity } from "@modules/roles/types/types";

type IntlLabelFormatter = (descriptor: { id: string }) => string;

export function buildRoleColumns(formatMessage: IntlLabelFormatter): ColumnDef<RoleEntity>[] {
    return [
        { accessorKey: "name", header: formatMessage({ id: "role.name" }) },
        { accessorKey: "type", header: formatMessage({ id: "role.type" }) },
        { accessorKey: "description", header: formatMessage({ id: "role.description" }) },
        {
            accessorKey: "createdAt",
            header: "Criado em",
            cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString("pt-BR") : ""),
        },
    ];
}

export const roleColumns = buildRoleColumns((descriptor) => descriptor.id);