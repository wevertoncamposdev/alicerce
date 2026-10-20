"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@components/ui/index";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useAuth } from "@/contexts/auth-context";
import useApiError from "@/hooks/useApiError";
import { resendInvite, cancelInvite } from "@modules/users/config/invite-actions";

// Só aparece enquanto o convite não foi aceito (pendingInvite) — depois
// disso o usuário já tem senha própria e isto não faz mais sentido.
export function PendingInviteControl({ userId }: { userId: string }) {
    const { hasPermission } = useAuth();
    const router = useRouter();
    const formatError = useApiError();
    const { confirm, dialog } = useConfirmDialog();
    const [isResending, setIsResending] = React.useState(false);
    const [isCancelling, setIsCancelling] = React.useState(false);

    async function handleResend() {
        setIsResending(true);
        try {
            await resendInvite(userId);
            toast("Convite reenviado");
        } catch (err) {
            toast("Falha ao reenviar convite", { description: formatError(err) });
        } finally {
            setIsResending(false);
        }
    }

    async function handleCancel() {
        const confirmed = await confirm({
            title: "Cancelar este convite?",
            description: "O usuário convidado será removido e o link de convite deixará de funcionar.",
            confirmLabel: "Cancelar convite",
            destructive: true,
        });
        if (!confirmed) return;

        setIsCancelling(true);
        try {
            await cancelInvite(userId);
            toast("Convite cancelado");
            router.push("/users");
        } catch (err) {
            toast("Falha ao cancelar convite", { description: formatError(err) });
            setIsCancelling(false);
        }
    }

    return (
        <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Convite pendente — o usuário ainda não definiu uma senha.</span>
            <div className="flex gap-2">
                {hasPermission("user.update") ? (
                    <Button type="button" variant="outline" size="sm" disabled={isResending} onClick={handleResend}>
                        {isResending ? "Reenviando..." : "Reenviar convite"}
                    </Button>
                ) : null}
                {hasPermission("user.delete") ? (
                    <Button type="button" variant="destructive" size="sm" disabled={isCancelling} onClick={handleCancel}>
                        {isCancelling ? "Cancelando..." : "Cancelar convite"}
                    </Button>
                ) : null}
            </div>
            {dialog}
        </div>
    );
}
