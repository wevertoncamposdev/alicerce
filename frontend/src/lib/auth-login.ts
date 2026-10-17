'use server';

import { redirect } from "next/navigation";
import { setSessionCookies, extractSetCookieValue, REFRESH_COOKIE } from "@lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

export async function loginWithCredentials(email: string, password: string) {
    const res = await fetch(`${INTERNAL_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const payload = await res.json();

    if (!res.ok) {
        throw new Error(payload?.message ?? "Credenciais inválidas.");
    }

    // O Nest manda o refresh token só via Set-Cookie, nunca no corpo (ver
    // session.ts/extractSetCookieValue) — payload.refresh_token não existe.
    const refreshToken = extractSetCookieValue(res.headers.getSetCookie(), REFRESH_COOKIE);
    if (!refreshToken) {
        throw new Error("Falha ao obter o refresh token da sessão.");
    }

    return {
        ...payload,
        refresh_token: refreshToken,
    } as {
        access_token: string;
        refresh_token: string;
        user: unknown;
        tenant: { id: string };
    };
}

export async function login(_prevState: { error: string | null }, formData: FormData) {
    try {
        const payload = await loginWithCredentials(
            String(formData.get("email") ?? ""),
            String(formData.get("password") ?? "")
        );

        await setSessionCookies({
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
            tenantId: payload.tenant.id,
        });
    } catch (err) {
        return { error: (err as Error).message };
    }

    redirect("/dashboard");
}
