'use server';

import { redirect } from "next/navigation";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

export async function acceptInviteWithToken(_prevState: { error: string | null }, formData: FormData) {
    try {
        const res = await fetch(`${INTERNAL_API_URL}/auth/accept-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: String(formData.get("token") ?? ""),
                password: String(formData.get("password") ?? ""),
            }),
        });

        if (!res.ok) {
            const payload = await res.json();
            throw new Error(payload?.message ?? "Falha ao aceitar o convite.");
        }
    } catch (err) {
        return { error: (err as Error).message };
    }

    redirect("/auth/login");
}
