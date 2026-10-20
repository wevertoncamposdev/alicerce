"use client";

import * as React from "react";
import { toast } from "sonner";
import { changeMyEmail } from "@modules/perfil/config/email-change-action";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import useApiError from "@/hooks/useApiError";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";

// Mesmo padrão de ChangePasswordControl: o e-mail só muda de fato depois
// que o link mandado pro endereço novo é confirmado — aqui só dispara o
// pedido, por isso não é um campo de autosave comum.
export function ChangeEmailControl({ currentEmail }: { currentEmail: string }) {
    const { setStatus } = useAutoSaveStatus();
    const formatError = useApiError();
    const [newEmail, setNewEmail] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);
    const [requested, setRequested] = React.useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setStatus("saving");

        try {
            await changeMyEmail(newEmail);
            setStatus("saved");
            setRequested(true);
            toast("Confirmação enviada", { description: `Confira a caixa de entrada de ${newEmail}.` });
        } catch (err) {
            console.error("[perfil] falha ao pedir troca de e-mail", err);
            setStatus("error", "Falha ao pedir a troca de e-mail.");
            toast("Falha ao pedir a troca de e-mail", { description: formatError(err) });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
                <Label>E-mail atual</Label>
                <p className="text-sm text-muted-foreground">{currentEmail}</p>
            </div>
            <div className="space-y-1">
                <Label htmlFor="newEmail">Novo e-mail</Label>
                <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="email"
                    required
                />
            </div>
            {requested ? (
                <p className="text-sm text-muted-foreground">
                    Enviamos um link de confirmação para o novo e-mail. O e-mail atual só muda depois que o link for confirmado.
                </p>
            ) : null}
            <Button type="submit" disabled={isSaving}>
                {isSaving ? "Enviando..." : "Trocar e-mail"}
            </Button>
        </form>
    );
}
