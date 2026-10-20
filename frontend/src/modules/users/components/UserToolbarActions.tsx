"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@components/ui/index";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import useApiError from "@/hooks/useApiError";
import { resendInvite } from "@modules/users/config/invite-actions";
import { updateUserStatus } from "@modules/users/config/status-action";
import type { UserEntity } from "@modules/users/types/types";

// Ações de ciclo de vida do usuário (Plano Base.md 8.2) — vivem na toolbar
// (AppTopbar), não mais inline no corpo da tela como o antigo
// PendingInviteControl.
export function UserToolbarActions({ user }: { user: UserEntity }) {
    const { hasPermission } = useAuth();
    const router = useRouter();
    const formatError = useApiError();
    const { setStatus: setAutoSaveStatus } = useAutoSaveStatus();
    const { confirm, dialog } = useConfirmDialog();
    const [isBusy, setIsBusy] = React.useState(false);

    if (!hasPermission("user.update")) {
        return null;
    }

    async function handleResend() {
        setIsBusy(true);
        try {
            await resendInvite(user.id);
            toast("Convite reenviado");
        } catch (err) {
            toast("Falha ao reenviar convite", { description: formatError(err) });
        } finally {
            setIsBusy(false);
        }
    }

    async function handleToggleStatus() {
        const activating = user.status !== "ACTIVE";
        const confirmed = await confirm({
            title: activating ? "Reativar este usuário?" : "Desativar este usuário?",
            description: activating
                ? "O usuário volta a poder fazer login normalmente."
                : "O usuário perde acesso imediatamente e todas as sessões abertas são encerradas.",
            confirmLabel: activating ? "Reativar" : "Desativar",
            destructive: !activating,
        });
        if (!confirmed) return;

        setIsBusy(true);
        setAutoSaveStatus("saving");
        try {
            await updateUserStatus(user.id, activating ? "ACTIVE" : "INACTIVE");
            setAutoSaveStatus("saved");
            toast(activating ? "Usuário reativado" : "Usuário desativado");
            router.refresh();
        } catch (err) {
            setAutoSaveStatus("error", "Falha ao atualizar status.");
            toast("Falha ao atualizar status", { description: formatError(err) });
        } finally {
            setIsBusy(false);
        }
    }

    return (
        <>
            {user.pendingInvite ? (
                <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={handleResend}>
                    Reenviar convite
                </Button>
            ) : (
                <Button
                    type="button"
                    variant={user.status === "ACTIVE" ? "destructive" : "outline"}
                    size="sm"
                    disabled={isBusy}
                    onClick={handleToggleStatus}
                >
                    {user.status === "ACTIVE" ? "Desativar" : "Reativar"}
                </Button>
            )}
            {dialog}
        </>
    );
}
