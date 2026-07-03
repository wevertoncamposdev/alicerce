// Este arquivo só roda no servidor: usa `next/headers`, que não existe no navegador.
// Se algum dia você importar isso sem querer dentro de um Client Component,
// o Next vai acusar erro de build — é o próprio framework te protegendo.
import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session_token";
export const TENANT_COOKIE = "session_tenant";

// Duração do cookie. Ajuste para bater com a expiração real do JWT emitido pelo Nest.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export interface SessionCookieOptions {
    accessToken: string;
    tenantId: string;
}

/**
 * Grava a sessão em dois cookies:
 * - session_token: httpOnly -> JavaScript no navegador NUNCA consegue ler isso.
 *   Só o servidor (Route Handlers, Server Components, middleware) lê.
 * - session_tenant: NÃO é httpOnly de propósito. Não é segredo (é só "qual tenant
 *   o usuário está olhando agora"), e a UI (ex: seletor de tenant) pode precisar
 *   ler/mudar no cliente. A autorização de verdade quem faz é o Nest, validando
 *   o JWT — este cookie é só um contexto de navegação.
 */
export async function setSessionCookies({ accessToken, tenantId }: SessionCookieOptions) {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });

    cookieStore.set(TENANT_COOKIE, tenantId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });
}

/** Apaga os dois cookies. Precisa ser feito no servidor (JS não pode apagar um cookie httpOnly). */
export async function clearSessionCookies() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(TENANT_COOKIE);
}

/** Lê o token da sessão atual. Use em Server Components, Route Handlers e middleware. */
export async function getSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionTenantId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(TENANT_COOKIE)?.value ?? null;
}