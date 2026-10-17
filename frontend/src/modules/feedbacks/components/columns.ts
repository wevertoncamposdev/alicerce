import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { FeedbackEntity } from "@modules/feedbacks/types/types";

const STATUS_LABELS: Record<FeedbackEntity["status"], string> = {
    RECEIVED: "Recebido",
    IN_REVIEW: "Em análise",
    PLANNED: "Planejado",
    DONE: "Concluído",
    DECLINED: "Recusado",
};

export const feedbackColumns: ColumnDef<AppTableFeatures, FeedbackEntity>[] = [
    { accessorKey: "title", header: "Título" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
    },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];
