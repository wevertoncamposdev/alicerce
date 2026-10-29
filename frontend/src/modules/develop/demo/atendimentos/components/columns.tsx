import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { AtendimentoTipoEnum, AtendimentoSituacaoEnum } from "@modules/develop/demo/_shared/enums";
import type { Atendimento } from "../types/types";

export const atendimentoColumns: ColumnDef<AppTableFeatures, Atendimento>[] = [
    { accessorKey: "data", header: "Data" },
    {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => <EnumBadge enumDef={AtendimentoTipoEnum} value={row.original.tipo} />,
    },
    { accessorKey: "profissional", header: "Profissional" },
    {
        accessorKey: "situacao",
        header: "Situação",
        cell: ({ row }) => <EnumBadge enumDef={AtendimentoSituacaoEnum} value={row.original.situacao} />,
    },
];
