import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies, extractSetCookieValue, REFRESH_COOKIE } from "@lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/** POST /api/auth/register — mesmo padrão do login, ver comentários lá. */
export async function POST(request: NextRequest) {
    const body = await request.json();

    const upstreamResponse = await fetch(`${INTERNAL_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const payload = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
        return NextResponse.json(payload, { status: upstreamResponse.status });
    }

    // O Nest manda o refresh token só via Set-Cookie, nunca no corpo —
    // payload.refresh_token não existe (ver extractSetCookieValue).
    const refreshToken = extractSetCookieValue(
        upstreamResponse.headers.getSetCookie(),
        REFRESH_COOKIE,
    );
    if (!refreshToken) {
        return NextResponse.json(
            { message: "Falha ao obter o refresh token da sessão." },
            { status: 500 },
        );
    }

    await setSessionCookies({
        accessToken: payload.access_token,
        refreshToken,
        tenantId: payload.tenant.id,
    });

    return NextResponse.json({
        user: payload.user,
        tenant: payload.tenant,
    });
}