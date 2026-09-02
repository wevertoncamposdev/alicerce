"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RoleEntity } from "@/modules/roles/types/types";
import { createRelationHost } from "@/lib/registry/relation-host";

export function PermissionRolesHost({ items }: { items: RoleEntity[] }) {
    const columns = React.useMemo<ColumnDef<RoleEntity>[]>(
        () => [
            { accessorKey: "name", header: "Nome" },
            { accessorKey: "type", header: "Tipo", cell: ({ row }) => row.original.type ?? "—" },
        ],
        [],
    );

    const RelationHost = React.useMemo(
        () => createRelationHost<RoleEntity>({
            title: "Usado pelos roles",
            columns,
            initialData: items,
            idAccessor: (r) => r.id,
        }),
        [columns, items],
    );

    return (
        <>
            <RelationHost initial={items} />
            {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum role usa esta permissão ainda.</p> : null}
        </>
    );
}
export default PermissionRolesHost;
