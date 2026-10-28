import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { Atendimento } from "../types/types";

const TIPO_LABELS: Record<Atendimento["tipo"], string> = {
    SOCIAL: "Social",
    PSICOLOGICO: "Psicológico",
};

const SITUACAO_LABELS: Record<Atendimento["situacao"], string> = {
    AGENDADO: "Agendado",
    REALIZADO: "Realizado",
    CANCELADO: "Cancelado",
};

export const atendimentoColumns: ColumnDef<AppTableFeatures, Atendimento>[] = [
    { accessorKey: "data", header: "Data" },
    {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => TIPO_LABELS[row.original.tipo] ?? row.original.tipo,
    },
    { accessorKey: "profissional", header: "Profissional" },
    {
        accessorKey: "situacao",
        header: "Situação",
        cell: ({ row }) => SITUACAO_LABELS[row.original.situacao] ?? row.original.situacao,
    },
];
