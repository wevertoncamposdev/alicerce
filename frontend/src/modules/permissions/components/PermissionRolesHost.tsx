"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { RoleEntity } from "@modules/roles/types/types";
import { RelationHost, type RelationHostConfig } from "@core/registry/relation-host";

function PermissionRolesHost({ items }: { items: RoleEntity[] }) {
    const columns = React.useMemo<ColumnDef<AppTableFeatures, RoleEntity>[]>(
        () => [
            { accessorKey: "name", header: "Nome" },
            { accessorKey: "type", header: "Tipo", cell: ({ row }) => row.original.type ?? "—" },
        ],
        [],
    );

    const config = React.useMemo<RelationHostConfig<RoleEntity>>(
        () => ({
            title: "Usado pelos papéis",
            columns,
            initialData: items,
            idAccessor: (r) => r.id,
            rowLink: (r) => `/roles/${r.id}`,
            emptyMessage: "Nenhum papel usa esta permissão ainda.",
        }),
        [columns, items],
    );

    return <RelationHost config={config} initial={items} />;
}
export default PermissionRolesHost;
