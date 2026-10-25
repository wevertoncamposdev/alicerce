// Equivalente de lib/api-server.ts para o usuário de plataforma (ADR 0012):
// lê o cookie platform_session_token em vez de session_token, nunca manda
// x-tenant-id (não se aplica), fala com /platform-auth e /management no
// Nest. Sem proxy BFF: todo uso aqui é Server Component/Server Action, que
// já roda no servidor — igual lib/api-server.ts, o proxy em
// app/api/proxy/[...path] só existe pra chamada vinda do browser, que esta
// área não tem.
import "server-only";
import { getPlatformSessionToken } from "@lib/platform-session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

type HttpMethod = "GET" | "POST" | "PATCH";

export class PlatformApiServerError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "PlatformApiServerError";
        this.status = status;
    }
}

async function request<T>(
    path: string,
    options: { method?: HttpMethod; body?: unknown; query?: Record<string, string | undefined> } = {},
): Promise<T> {
    const { method = "GET", body, query } = options;
    const token = await getPlatformSessionToken();

    if (!token) {
        throw new PlatformApiServerError("Sessão de plataforma não encontrada.", 401);
    }

    const cleanBase = INTERNAL_API_URL.replace(/\/+$/, "");
    const cleanPath = path.replace(/^\/+/, "");
    const searchParams = new URLSearchParams();
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) searchParams.set(key, value);
        }
    }
    const queryString = searchParams.toString();
    const url = `${cleanBase}/${cleanPath}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
        method,
        cache: "no-store",
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            typeof data === "object" && data && "message" in data
                ? String((data as { message: unknown }).message)
                : `Request failed with status ${response.status}`;
        throw new PlatformApiServerError(message, response.status);
    }

    return data as T;
}

export const platformApiServer = {
    get: <T>(path: string, query?: Record<string, string | undefined>) =>
        request<T>(path, { method: "GET", query }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
};
