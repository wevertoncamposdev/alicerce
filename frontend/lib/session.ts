// Este arquivo só roda no servidor: usa `next/headers`, que não existe no navegador.
// Se algum dia você importar isso sem querer dentro de um Client Component,
// o Next vai acusar erro de build — é o próprio framework te protegendo.
import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session_token";
export const TENANT_COOKIE = "session_tenant";
// Cookie que guarda o refresh token opaco. Enviado automaticamente pelo browser
// para /api/auth/* graças ao path restrito — e jamais acessível via JS.
export const REFRESH_COOKIE = "refresh_token";

const SESSION_MAX_AGE_SECONDS = 60 * 15;         // 15 min — igual ao JWT
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export interface SessionCookieOptions {
    accessToken: string;
    tenantId: string;
    refreshToken: string;
}

/**
 * Grava a sessão em três cookies:
 * - session_token: httpOnly — access JWT; só o servidor lê.
 * - refresh_token: httpOnly, path=/api/auth — refresh opaco; só vai para endpoints de auth.
 * - session_tenant: NÃO httpOnly — contexto de navegação para a UI (ex: seletor de tenant).
 *   A autorização real é feita pelo Nest validando o JWT, não por este cookie.
 */
export async function setSessionCookies({ accessToken, tenantId, refreshToken }: SessionCookieOptions) {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });

    cookieStore.set(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        // Path restrito: o browser só envia este cookie para /api/auth/*,
        // não para /api/users, /api/tasks etc. Reduz a superfície de ataque.
        path: "/api/auth",
        maxAge: REFRESH_MAX_AGE_SECONDS,
    });

    cookieStore.set(TENANT_COOKIE, tenantId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_MAX_AGE_SECONDS,
    });
}

/** Apaga os três cookies. Precisa ser feito no servidor (JS não pode apagar httpOnly). */
export async function clearSessionCookies() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
    cookieStore.delete(TENANT_COOKIE);
}

/** Lê o access token da sessão atual. Use em Server Components, Route Handlers e middleware. */
export async function getSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Lê o refresh token opaco. Usado pelo Route Handler de refresh do BFF. */
export async function getRefreshToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
}

export async function getSessionTenantId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(TENANT_COOKIE)?.value ?? null;
}