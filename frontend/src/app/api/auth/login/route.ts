import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@lib/session";
import { loginWithCredentials } from "@/features/auth/services/login.service";

/**
 * POST /api/auth/login
 *
 * Isso é um Route Handler: um arquivo `route.ts` dentro de `app/` vira um
 * endpoint de API do PRÓPRIO Next.js, rodando em Node no servidor. O
 * navegador chama ESTE endpoint (mesma origem, sem CORS envolvido) — quem
 * fala com o NestJS é este código aqui, que roda no servidor.
 */
// route.ts


export async function POST(request: NextRequest) {
    const body = await request.json();

    try {
        const payload = await loginWithCredentials(body.email, body.password);
        await setSessionCookies({
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
            tenantId: payload.tenant.id,
        });
        return NextResponse.json({ user: payload.user, tenant: payload.tenant });
    } catch (err) {
        return NextResponse.json({ message: (err as Error).message }, { status: 401 });
    }
}