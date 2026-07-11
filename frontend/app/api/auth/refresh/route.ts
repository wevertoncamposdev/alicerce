import { NextResponse } from "next/server";
import { getRefreshToken, setSessionCookies } from "@/lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/**
 * POST /api/auth/refresh
 *
 * Chamado pelo proxy BFF quando recebe 401 do Nest (access token expirado).
 * Lê o refresh_token do cookie httpOnly local, envia ao Nest, e se for válido:
 * - Atualiza o cookie session_token com o novo access token
 * - Atualiza o cookie refresh_token com o novo refresh token (rotação)
 *
 * Se o Nest retornar 401 (token expirado ou reuso detectado):
 * - Retorna 401 para o proxy, que limpa a sessão e força novo login.
 *
 * Este endpoint NUNCA é chamado diretamente pelo browser — só pelo proxy BFF.
 */
export async function POST() {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
        return NextResponse.json({ error: "Sem refresh token" }, { status: 401 });
    }

    const upstreamResponse = await fetch(`${INTERNAL_API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // Passamos o cookie de refresh via header nesta chamada servidor-a-servidor.
            // O Nest espera o cookie refresh_token para processar a renovação.
            "Cookie": `refresh_token=${refreshToken}`,
        },
    });

    if (!upstreamResponse.ok) {
        // Nest rejeitou o refresh (token expirado, revogado ou reuso detectado).
        // Retornamos 401 — o proxy BFF vai limpar a sessão e redirecionar pro login.
        const payload = await upstreamResponse.json().catch(() => ({}));
        return NextResponse.json(payload, { status: 401 });
    }

    const payload = await upstreamResponse.json();

    // Persiste o novo par de tokens nos cookies
    await setSessionCookies({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        tenantId: payload.tenant.id,
    });

    return NextResponse.json({ ok: true });
}
