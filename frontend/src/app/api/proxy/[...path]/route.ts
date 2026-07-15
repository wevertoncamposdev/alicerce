import { NextRequest, NextResponse } from "next/server";
import { getSessionTenantId, getSessionToken, clearSessionCookies } from "@lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/**
 * app/api/proxy/[...path]/route.ts
 *
 * BFF Proxy: Traduz cookies httpOnly do Next.js em Authorization Bearer headers
 * para a API interna do NestJS.
 *
 * Implementa a estratégia de Retry-on-401: caso o access token JWT expire (15 min),
 * o BFF tenta chamar silenciosamente o endpoint de renovação de sessão usando o
 * cookie de refresh token. Se conseguir, atualiza os cookies de sessão no browser e
 * refaz a requisição original com o novo token, gerando uma experiência transparente.
 */
async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    let token = await getSessionToken();

    if (!token) {
        return NextResponse.json({ message: "Sessão não encontrada." }, { status: 401 });
    }

    const tenantId = await getSessionTenantId();
    const targetPath = path.join("/");
    const search = request.nextUrl.search; // preserva query parameters

    // Helper para realizar a chamada ao NestJS
    const fetchFromUpstream = async (accessToken: string) => {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${accessToken}`,
        };

        if (tenantId) {
            headers["x-tenant-id"] = tenantId;
        }

        let body: string | undefined;
        if (!["GET", "HEAD", "DELETE"].includes(request.method)) {
            // Clona a request antes de ler para evitar que uma segunda tentativa falhe
            // caso precisemos ler o body novamente após um refresh.
            const raw = await request.clone().text();
            if (raw) {
                body = raw;
                headers["Content-Type"] = "application/json";
            }
        }

        return fetch(`${INTERNAL_API_URL}/${targetPath}${search}`, {
            method: request.method,
            headers,
            body,
            cache: "no-store",
        });
    };

    let response = await fetchFromUpstream(token);

    // Caso retorne 401, o access token pode ter expirado. Tentamos o fluxo de refresh.
    if (response.status === 401) {
        // Chamada interna para a rota local /api/auth/refresh
        // O Next.js enviará automaticamente o cookie de refresh_token correspondente à requisição.
        const refreshUrl = new URL("/api/auth/refresh", request.url);

        const refreshResponse = await fetch(refreshUrl, {
            method: "POST",
            headers: {
                // Repassa os cookies do browser (incluindo o refresh_token) para o próprio Next.js
                Cookie: request.headers.get("cookie") ?? "",
            },
        });

        if (refreshResponse.ok) {
            // O refresh deu certo e os cookies novos já foram gravados pelo handler do /api/auth/refresh.
            // Precisamos recuperar o novo token da resposta ou do novo cookie.
            // Para segurança e agilidade, o Next.js BFF expõe o novo token ao reler os cookies.
            const cookieHeader = refreshResponse.headers.get("set-cookie");

            // Recarrega o token de sessão atualizado
            const newToken = await getSessionToken();

            if (newToken) {
                // Refaz a chamada original usando o novo token gerado
                const retryResponse = await fetchFromUpstream(newToken);

                // Repassa os cabeçalhos de Set-Cookie do refreshResponse para que o browser
                // receba o novo access e refresh tokens atualizados
                const finalResponse = retryResponse.status === 204
                    ? new NextResponse(null, { status: 204 })
                    : NextResponse.json(await retryResponse.json().catch(() => null), { status: retryResponse.status });

                if (cookieHeader) {
                    finalResponse.headers.append("Set-Cookie", cookieHeader);
                }
                return finalResponse;
            }
        }

        // Se o refresh falhar (expirado, revogado ou invasão por reuso detectada):
        // Limpamos todos os cookies da sessão no servidor e devolvemos 401 definitivo.
        await clearSessionCookies();
        return NextResponse.json({ message: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }

    if (response.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
}

export {
    handler as GET,
    handler as POST,
    handler as PATCH,
    handler as PUT,
    handler as DELETE,
};