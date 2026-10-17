"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import useApiError from "@/hooks/useApiError";
import type { FeedbackEntity, FeedbackStatus } from "@modules/feedbacks/types/types";

const STATUS_OPTIONS: Array<{ value: FeedbackStatus; label: string }> = [
    { value: "RECEIVED", label: "Recebido" },
    { value: "IN_REVIEW", label: "Em análise" },
    { value: "PLANNED", label: "Planejado" },
    { value: "DONE", label: "Concluído" },
    { value: "DECLINED", label: "Recusado" },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<FeedbackStatus, string>;

// Mudar o status é uma permissão separada (`feedback.manage`) da edição comum
// (`feedback.update`) — o backend já bloqueia quem não tem a permissão
// (FeedbacksController.updateStatus); aqui só evitamos mostrar um controle
// que o usuário não conseguiria usar.
export function FeedbackStatusControl({ feedback }: { feedback: FeedbackEntity }) {
    const { hasPermission } = useAuth();
    const { setStatus: setAutoSaveStatus } = useAutoSaveStatus();
    const formatError = useApiError();
    const router = useRouter();
    const [status, setLocalStatus] = React.useState<FeedbackStatus>(feedback.status);
    const [isSaving, setIsSaving] = React.useState(false);

    if (!hasPermission("feedback.manage")) {
        return (
            <span className="inline-flex items-center rounded-md border px-2 py-1 text-sm text-muted-foreground">
                {STATUS_LABELS[status] ?? status}
            </span>
        );
    }

    async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const next = e.target.value as FeedbackStatus;
        const previous = status;
        setLocalStatus(next);
        setIsSaving(true);
        setAutoSaveStatus("saving");

        try {
            await apiClient.patch(`feedbacks/${feedback.id}/status`, { status: next });
            setAutoSaveStatus("saved");
            toast("Status atualizado");
            router.refresh();
        } catch (err) {
            console.error("[feedback] falha ao mudar status", err);
            setLocalStatus(previous);
            setAutoSaveStatus("error", "Falha ao atualizar status.");
            toast("Falha ao atualizar status", { description: formatError(err) });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <select
            value={status}
            onChange={handleChange}
            disabled={isSaving}
            className="rounded-md border bg-background px-2 py-1 text-sm disabled:opacity-50"
        >
            {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
