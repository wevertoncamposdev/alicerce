import { NextResponse } from "next/server";
import { clearSessionCookies, getRefreshToken } from "@lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/**
 * POST /api/auth/logout
 *
 * Antes: só apagava o cookie local (o token ainda era válido no Nest até expirar).
 * Agora: revoga o refresh token no banco (toda a família) antes de apagar os cookies.
 *
 * O access token ainda vive até expirar (15 min), mas sem refresh token válido,
 * o usuário não consegue renovar — na prática a sessão está morta.
 * Revogação imediata do access token exigiria blacklist em Redis (Fase 4).
 */
export async function POST() {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
        // Faz a revogação no Nest, passando o cookie de refresh.
        // Silencia erros — o logout do ponto de vista do browser acontece
        // de qualquer forma (cookies apagados abaixo).
        await fetch(`${INTERNAL_API_URL}/auth/logout`, {
            method: "POST",
            // O Nest lê o refresh token do cookie, então precisamos passá-lo
            // via header Cookie nesta chamada servidor-a-servidor.
            // (O browser não envia cookies automáticos em chamadas server-side do Next.)
            headers: {
                "Cookie": `refresh_token=${refreshToken}`,
            },
        }).catch(() => { /* logout silencioso se Nest estiver fora */ });
    }

    await clearSessionCookies();
    return NextResponse.json({ ok: true });
}