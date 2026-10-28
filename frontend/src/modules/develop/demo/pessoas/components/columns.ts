import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { Pessoa } from "../types/types";

const STATUS_LABELS: Record<Pessoa["status"], string> = {
    ATIVO: "Ativo",
    INATIVO: "Inativo",
};

export const pessoaColumns: ColumnDef<AppTableFeatures, Pessoa>[] = [
    { accessorKey: "nome", header: "Nome" },
    { accessorKey: "cidade", header: "Cidade" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
    },
    { accessorKey: "telefone", header: "Telefone" },
];
