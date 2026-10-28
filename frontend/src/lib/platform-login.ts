'use server';

import { redirect } from "next/navigation";
import { setPlatformSessionCookie, clearPlatformSessionCookie } from "@lib/platform-session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

export async function platformLogin(_prevState: { error: string | null }, formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const res = await fetch(`${INTERNAL_API_URL}/platform-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
        return { error: (payload?.message as string | undefined) ?? "Credenciais inválidas." };
    }

    await setPlatformSessionCookie((payload as { access_token: string }).access_token);
    redirect("/platform/tenants");
}

export async function platformLogout() {
    await clearPlatformSessionCookie();
    redirect("/platform/login");
}
