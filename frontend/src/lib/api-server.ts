// lib/api-server.ts
//
// Equivalente server-only de lib/api-client.ts, para uso em Server
// Components e Server Actions. Em vez de chamar /api/proxy/... (que existe
// só para o browser conseguir trocar o cookie por um Bearer), aqui a gente
// JÁ está no servidor: lê o cookie direto via lib/session.ts e chama o Nest
// sem o hairpin extra pela própria rota de proxy.
import "server-only";
import { getSessionTenantId, getSessionToken } from "@lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "SEARCH";

type ApiServerOptions = {
    method?: HttpMethod;
    body?: unknown;
    cache?: RequestCache;
    query?: Record<string, string | undefined>;
    // Alguns endpoints (ex.: /me/password, /me/sessions) precisam do cookie
    // de refresh token, que este cliente não envia por padrão (só o Bearer)
    // — quem chama lê via lib/session.ts e repassa aqui, mesmo padrão manual
    // de cookie já usado pelas Route Handlers de auth (ver session.ts).
    headers?: Record<string, string>;
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
    const { method = "GET", body, cache = "no-store", query, headers: extraHeaders } = options;

    const token = await getSessionToken();

    if (!token) {
        throw new ApiServerError("Sessão não encontrada.", 401, null);
    }

    const tenantId = await getSessionTenantId();

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...extraHeaders,
    };

    if (tenantId) headers["x-tenant-id"] = tenantId;
    if (body !== undefined) headers["Content-Type"] = "application/json";

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

// Upload multipart (ex.: POST /files) — não reusa `request()`: ela sempre
// faz JSON.stringify(body) e força Content-Type: application/json quando
// body !== undefined, o que corromperia um FormData. Aqui o fetch monta o
// boundary multipart sozinho a partir do FormData — por isso NÃO setamos
// Content-Type manualmente.
async function upload<T>(path: string, formData: FormData): Promise<T> {
    const token = await getSessionToken();

    if (!token) {
        throw new ApiServerError("Sessão não encontrada.", 401, null);
    }

    const tenantId = await getSessionTenantId();

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
    };
    if (tenantId) headers["x-tenant-id"] = tenantId;

    const cleanBase = INTERNAL_API_URL.replace(/\/+$/, "");
    const cleanPath = path.replace(/^\/+/, "");

    const response = await fetch(`${cleanBase}/${cleanPath}`, {
        method: "POST",
        headers,
        body: formData,
        cache: "no-store",
    });

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


type ExtraOptions = { headers?: Record<string, string> };

export const apiServer = {
    search,
    upload,
    get: <T>(path: string, options?: { cache?: RequestCache, query?: Record<string, string | undefined> } & ExtraOptions) =>
        request<T>(path, { method: "GET", cache: options?.cache, query: options?.query, headers: options?.headers }),

    post: <T>(path: string, body?: unknown, options?: ExtraOptions) =>
        request<T>(path, { method: "POST", body, headers: options?.headers }),

    put: <T>(path: string, body?: unknown, options?: ExtraOptions) =>
        request<T>(path, { method: "PUT", body, headers: options?.headers }),

    patch: <T>(path: string, body?: unknown, options?: ExtraOptions) =>
        request<T>(path, { method: "PATCH", body, headers: options?.headers }),

    delete: <T>(path: string, options?: ExtraOptions) =>
        request<T>(path, { method: "DELETE", headers: options?.headers }),
};
