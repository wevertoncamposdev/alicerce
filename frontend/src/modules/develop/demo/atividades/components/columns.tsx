import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { AtividadeStatusEnum } from "@modules/develop/demo/_shared/enums";
import type { Atividade } from "../types/types";

export const atividadeColumns: ColumnDef<AppTableFeatures, Atividade>[] = [
    { accessorKey: "nome", header: "Atividade" },
    { accessorKey: "categoria", header: "Categoria" },
    { accessorKey: "diaHorario", header: "Dia/Horário" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EnumBadge enumDef={AtividadeStatusEnum} value={row.original.status} />,
    },
];
