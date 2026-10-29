"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateFeedbackStatus } from "@modules/feedbacks/config/status-action";
import { FeedbackStatusEnum } from "@modules/feedbacks/config/status-enum";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import { useAuth } from "@/contexts/auth-context";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import useApiError from "@/hooks/useApiError";
import type { FeedbackEntity, FeedbackStatus } from "@modules/feedbacks/types/types";

const STATUS_OPTIONS = FeedbackStatusEnum.options();

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
        return <EnumBadge enumDef={FeedbackStatusEnum} value={status} />;
    }

    async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const next = e.target.value as FeedbackStatus;
        const previous = status;
        setLocalStatus(next);
        setIsSaving(true);
        setAutoSaveStatus("saving");

        try {
            await updateFeedbackStatus(feedback.id, next);
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
