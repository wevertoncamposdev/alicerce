import { NextRequest, NextResponse } from "next/server";
import { getSessionTenantId, getSessionToken } from "@/lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/**
 * app/api/proxy/[...path]/route.ts
 *
 * O `[...path]` é uma "catch-all route": captura QUALQUER coisa depois de
 * /api/proxy/. Uma chamada do navegador para /api/proxy/user vira
 * path = ["user"]; para /api/proxy/roles/123 vira path = ["roles", "123"].
 *
 * Esse arquivo é o "tradutor" cookie -> Bearer que discutimos: o navegador
 * nunca vê o token, só manda o cookie (automaticamente, por ser mesma
 * origem); aqui a gente lê o cookie e monta o header que o Nest espera.
 *
 * Isso existe pra você não precisar reescrever TODAS as telas (roles,
 * permissions, tenants...) no mesmo dia que migrou o auth pra cookie —
 * elas continuam chamando a "API" normalmente, só que apontando pra cá
 * em vez de apontar direto pro Nest.
 */

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    const token = await getSessionToken();

    if (!token) {
        return NextResponse.json({ message: "Sessão não encontrada." }, { status: 401 });
    }

    const tenantId = await getSessionTenantId();
    const targetPath = path.join("/");
    const search = request.nextUrl.search; // preserva ?query=string

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
    };

    if (tenantId) {
        headers["x-tenant-id"] = tenantId;
    }

    let body: string | undefined;
    if (!["GET", "HEAD", "DELETE"].includes(request.method)) {
        const raw = await request.text();
        if (raw) {
            body = raw;
            headers["Content-Type"] = "application/json";
        }
    }

    const upstreamResponse = await fetch(`${INTERNAL_API_URL}/${targetPath}${search}`, {
        method: request.method,
        headers,
        body,
        // Mutações e dados por tenant/usuário não devem ser cacheados aqui.
        cache: "no-store",
    });

    if (upstreamResponse.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const payload = await upstreamResponse.json().catch(() => null);
    return NextResponse.json(payload, { status: upstreamResponse.status });
}

export {
    handler as GET,
    handler as POST,
    handler as PATCH,
    handler as PUT,
    handler as DELETE,
};