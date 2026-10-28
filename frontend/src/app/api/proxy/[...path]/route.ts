import { NextRequest, NextResponse } from "next/server";
import { getSessionTenantId, getSessionToken, clearSessionCookies } from "@lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

// D6 (docs/PLAN-fundacao-ux.md): até aqui toda resposta OK virava JSON —
// quebraria num corpo binário (GET /files/:id/content, driver local) e
// num redirect seguido automaticamente nunca chegaria ao browser (driver
// s3/R2, precisa que o <img> siga o 302 ele mesmo pra CSP/host do bucket
// funcionarem). Usado tanto no fluxo normal quanto no retry pós-refresh.
async function buildProxyResponse(response: Response): Promise<NextResponse> {
    if (response.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
        return new NextResponse(null, { status: response.status, headers: { Location: location } });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        return new NextResponse(response.body, {
            status: response.status,
            headers: contentType ? { "Content-Type": contentType } : undefined,
        });
    }

    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
}

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
    const token = await getSessionToken();

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
            // D6 (docs/PLAN-fundacao-ux.md): GET /files/:id/content pode
            // devolver um 302 pra URL assinada do storage provider (driver
            // s3/R2) — sem isto, o fetch já seguiria o redirect aqui dentro
            // do servidor Next, baixando o binário no meio do caminho em
            // vez de deixar o browser seguir direto pro bucket.
            redirect: "manual",
        });
    };

    const response = await fetchFromUpstream(token);

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
                const finalResponse = await buildProxyResponse(retryResponse);

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

    return buildProxyResponse(response);
}

export {
    handler as GET,
    handler as POST,
    handler as PATCH,
    handler as PUT,
    handler as DELETE,
    handler as SEARCH,
};