"use client";

import { ColumnDef } from "@tanstack/react-table";
import { TypeView } from "@/components/TypeView";
import { AuditEntry } from "../audit.types";

function formatDate(value: string) {
    return new Date(value).toLocaleString("pt-BR");
}

interface AuditTableProps {
    entries: AuditEntry[];
}

export default function AuditTable({ entries }: AuditTableProps) {
    const auditColumns: ColumnDef<AuditEntry>[] = [
        {
            accessorKey: "createdAt",
            header: "Data",
            cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
        },
        {
            accessorKey: "action",
            header: "Acao",
            cell: ({ row }) => <span>{row.original.action}</span>,
        },
        {
            accessorKey: "entity",
            header: "Entidade",
            cell: ({ row }) => <span>{row.original.entity}</span>,
        },
        {
            accessorKey: "userId",
            header: "Usuario",
            cell: ({ row }) => <span>{row.original.userId}</span>,
        },
    ];

    return (
        <TypeView
            mode="table"
            data={entries}
            columns={auditColumns}
            emptyMessage="Nenhum registro encontrado."
        />
    );
}
