"use client";

import * as React from "react";
import { toast } from "sonner";
import { changeMyPassword } from "@modules/perfil/config/password-action";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import useApiError from "@/hooks/useApiError";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";

// Mesmo padrão de FeedbackStatusControl: estado próprio, chama a Server
// Action, toast de erro/sucesso — não é um campo de autosave comum (não
// tem "valor atual" pra mostrar, só a ação de trocar).
export function ChangePasswordControl() {
    const { setStatus } = useAutoSaveStatus();
    const formatError = useApiError();
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setStatus("saving");

        try {
            await changeMyPassword(currentPassword, newPassword);
            setStatus("saved");
            toast("Senha atualizada", { description: "As outras sessões abertas foram encerradas." });
            setCurrentPassword("");
            setNewPassword("");
        } catch (err) {
            console.error("[perfil] falha ao trocar senha", err);
            setStatus("error", "Falha ao trocar a senha.");
            toast("Falha ao trocar a senha", { description: formatError(err) });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                />
            </div>
            <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Trocar senha"}
            </Button>
        </form>
    );
}
