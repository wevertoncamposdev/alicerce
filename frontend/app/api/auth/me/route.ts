import { NextResponse } from "next/server";
import { getSessionTenantId, getSessionToken } from "@/lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/**
 * GET /api/auth/me
 *
 * Usado pelo AuthContext ao carregar o app (F5, abrir nova aba) para saber
 * "quem está logado", sem nunca precisar que o navegador guarde o token.
 * O navegador manda o cookie automaticamente (mesma origem) -> este handler
 * lê o cookie -> monta Authorization: Bearer -> pergunta pro Nest.
 */
export async function GET() {
    const token = await getSessionToken();

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const upstreamResponse = await fetch(`${INTERNAL_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        // no-store: este dado é sensível a sessão e a role, nunca deve entrar
        // no Data Cache do Next (que é compartilhado entre requisições).
        cache: "no-store",
    });

    if (!upstreamResponse.ok) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await upstreamResponse.json();
    const tenantId = await getSessionTenantId();

    return NextResponse.json({ user, tenantId });
}