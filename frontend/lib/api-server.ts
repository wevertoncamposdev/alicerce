// lib/api-server.ts
//
// Equivalente server-only de lib/api-client.ts, para uso em Server
// Components e Server Actions. Em vez de chamar /api/proxy/... (que existe
// só para o browser conseguir trocar o cookie por um Bearer), aqui a gente
// JÁ está no servidor: lê o cookie direto via lib/session.ts e chama o Nest
// sem o hairpin extra pela própria rota de proxy.
import "server-only";
import { getSessionTenantId, getSessionToken } from "@/lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "SEARCH";

type ApiServerOptions = {
    method?: HttpMethod;
    body?: unknown;
    cache?: RequestCache;
};

export class ApiServerError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
        super(message);
        this.name = "ApiServerError";
        this.status = status;
        this.data = data;
    }
}

async function request<T>(path: string, options: ApiServerOptions = {}): Promise<T> {
    const { method = "GET", body, cache = "no-store" } = options;

    const token = await getSessionToken();

    if (!token) {
        throw new ApiServerError("Sessão não encontrada.", 401, null);
    }

    const tenantId = await getSessionTenantId();

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
    };

    if (tenantId) headers["x-tenant-id"] = tenantId;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const cleanBase = INTERNAL_API_URL.replace(/\/+$/, "");
    const cleanPath = path.replace(/^\/+/, "");
    const url = `${cleanBase}/${cleanPath}`;

    const response = await fetch(url, {
        method,
        cache,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
        return null as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json().catch(() => null) : await response.text();

    if (!response.ok) {
        const message =
            typeof data === "object" && data && "message" in data
                ? String((data as { message: unknown }).message)
                : `Request failed with status ${response.status}`;

        throw new ApiServerError(message, response.status, data);
    }

    return data as T;
}

async function search<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
        method: "SEARCH",
        body,
    });
}


export const apiServer = {
    search,
    get: <T>(path: string, options?: { cache?: RequestCache }) =>
        request<T>(path, { method: "GET", cache: options?.cache }),

    post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),

    put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),

    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),

    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
