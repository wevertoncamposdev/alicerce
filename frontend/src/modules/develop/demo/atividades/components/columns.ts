import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { Atividade } from "../types/types";

const STATUS_LABELS: Record<Atividade["status"], string> = {
    ATIVA: "Ativa",
    INATIVA: "Inativa",
};

export const atividadeColumns: ColumnDef<AppTableFeatures, Atividade>[] = [
    { accessorKey: "nome", header: "Atividade" },
    { accessorKey: "categoria", header: "Categoria" },
    { accessorKey: "diaHorario", header: "Dia/Horário" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
    },
];
