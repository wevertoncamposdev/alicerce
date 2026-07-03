import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/**
 * POST /api/auth/login
 *
 * Isso é um Route Handler: um arquivo `route.ts` dentro de `app/` vira um
 * endpoint de API do PRÓPRIO Next.js, rodando em Node no servidor. O
 * navegador chama ESTE endpoint (mesma origem, sem CORS envolvido) — quem
 * fala com o NestJS é este código aqui, que roda no servidor.
 */
export async function POST(request: NextRequest) {
    const body = await request.json();

    // Chamada servidor-a-servidor. Não é o fetch "estendido" do Next porque
    // é um POST (mutação) — o Data Cache do Next só se aplica a GET por
    // natureza (POST nunca é cacheado, com ou sem framework).
    const upstreamResponse = await fetch(`${INTERNAL_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const payload = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
        // Repassamos o erro do Nest tal como veio (mensagem de validação etc.)
        return NextResponse.json(payload, { status: upstreamResponse.status });
    }

    // O access_token e o refresh_token NUNCA saem como JSON.
    // Ambos vão para cookies httpOnly via Set-Cookie.
    await setSessionCookies({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        tenantId: payload.tenant.id,
    });

    return NextResponse.json({
        user: payload.user,
        tenant: payload.tenant,
    });
}