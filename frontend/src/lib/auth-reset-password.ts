'use server';

import { redirect } from "next/navigation";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

export async function resetPasswordWithToken(_prevState: { error: string | null }, formData: FormData) {
    try {
        const res = await fetch(`${INTERNAL_API_URL}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: String(formData.get("token") ?? ""),
                newPassword: String(formData.get("newPassword") ?? ""),
            }),
        });

        if (!res.ok) {
            const payload = await res.json();
            throw new Error(payload?.message ?? "Falha ao redefinir senha.");
        }
    } catch (err) {
        return { error: (err as Error).message };
    }

    redirect("/auth/login");
}
