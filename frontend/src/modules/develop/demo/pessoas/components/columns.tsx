import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { PessoaStatusEnum } from "@modules/develop/demo/_shared/enums";
import type { Pessoa } from "../types/types";

export const pessoaColumns: ColumnDef<AppTableFeatures, Pessoa>[] = [
    { accessorKey: "nome", header: "Nome" },
    { accessorKey: "cidade", header: "Cidade" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EnumBadge enumDef={PessoaStatusEnum} value={row.original.status} />,
    },
    { accessorKey: "telefone", header: "Telefone" },
];
