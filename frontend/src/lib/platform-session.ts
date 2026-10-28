// Sessão de usuário de plataforma (ADR 0012) — paralela à de
// lib/session.ts, nunca misturada com ela: cookie próprio, sem
// session_tenant (não se aplica a um ator sem tenant) e sem refresh token
// (login de platform user não tem rotação nesta rodada — token de 8h).
import "server-only";
import { cookies } from "next/headers";

export const PLATFORM_SESSION_COOKIE = "platform_session_token";
const PLATFORM_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h — igual ao JWT (ver backend/core/platform-auth)

export async function setPlatformSessionCookie(accessToken: string) {
    const cookieStore = await cookies();
    cookieStore.set(PLATFORM_SESSION_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        path: "/",
        maxAge: PLATFORM_SESSION_MAX_AGE_SECONDS,
    });
}

export async function clearPlatformSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(PLATFORM_SESSION_COOKIE);
}

export async function getPlatformSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(PLATFORM_SESSION_COOKIE)?.value ?? null;
}
