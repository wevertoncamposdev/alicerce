"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RoleEntity } from "@modules/roles/types/types";
import { RelationHost, type RelationHostConfig } from "@lib/registry/relation-host";

export function PermissionRolesHost({ items }: { items: RoleEntity[] }) {
    const columns = React.useMemo<ColumnDef<RoleEntity>[]>(
        () => [
            { accessorKey: "name", header: "Nome" },
            { accessorKey: "type", header: "Tipo", cell: ({ row }) => row.original.type ?? "—" },
        ],
        [],
    );

    const config = React.useMemo<RelationHostConfig<RoleEntity>>(
        () => ({
            title: "Usado pelos roles",
            columns,
            initialData: items,
            idAccessor: (r) => r.id,
            emptyMessage: "Nenhum role usa esta permissão ainda.",
        }),
        [columns, items],
    );

    return <RelationHost config={config} initial={items} />;
}
export default PermissionRolesHost;
