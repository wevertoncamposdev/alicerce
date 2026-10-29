import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { FeedbackStatusEnum } from "@modules/feedbacks/config/status-enum";
import type { FeedbackEntity } from "@modules/feedbacks/types/types";

export const feedbackColumns: ColumnDef<AppTableFeatures, FeedbackEntity>[] = [
    { accessorKey: "title", header: "Título" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EnumBadge enumDef={FeedbackStatusEnum} value={row.original.status} />,
    },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];
