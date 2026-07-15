"use client";

import { useMemo, useState } from "react";
import { Button, Input } from "@components/ui/index";
import { UserEntity } from "@/features/users/user.types";

interface UsersFormProps {
    mode: "create" | "edit";
    initialUser?: UserEntity | null;
    saving?: boolean;
    onSubmit: (payload: { email: string; password?: string }) => Promise<void>;
    onCancel?: () => void;
}

export default function UsersForm({
    mode,
    initialUser,
    saving = false,
    onSubmit,
    onCancel,
}: UsersFormProps) {
    const [email, setEmail] = useState(initialUser?.email ?? "");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const title = useMemo(
        () => (mode === "create" ? "Cadastrar usuario" : "Editar usuario"),
        [mode],
    );

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!email.trim()) {
            setError("E-mail e obrigatorio.");
            return;
        }

        if (mode === "create" && !password.trim()) {
            setError("Senha e obrigatoria para novo usuario.");
            return;
        }

        try {
            await onSubmit({
                email,
                ...(password ? { password } : {}),
            });

            if (mode === "create") {
                setEmail("");
                setPassword("");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Falha ao salvar usuario.";
            setError(message);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Input
                placeholder="E-mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={saving}
            />
            <Input
                placeholder={mode === "create" ? "Senha" : "Nova senha (opcional)"}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
            />

            {error ? (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="flex items-center gap-2">
                <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : mode === "create" ? "Cadastrar" : "Salvar"}
                </Button>
                {mode === "edit" && onCancel ? (
                    <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
                        Cancelar
                    </Button>
                ) : null}
            </div>
        </form>
    );
}
