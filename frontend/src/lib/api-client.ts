// lib/api-client.ts

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "SEARCH";

type ApiClientOptions = {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    cache?: RequestCache;
};

class ApiError extends Error {
    status: number;
    data: unknown;
    code?: string;

    constructor(message: string, status: number, data: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
        // try to extract a code if present
        if (data && typeof data === 'object' && 'code' in (data as any)) {
            this.code = String((data as any).code);
        }
    }

    friendlyMessage() {
        // common NestJS error shapes: { statusCode, message, error }
        if (this.data && typeof this.data === 'object') {
            const d: any = this.data;
            if (Array.isArray(d.message)) return d.message.join('; ');
            if (typeof d.message === 'string') return d.message;
            if (typeof d.error === 'string') return d.error;
        }
        return this.message;
    }
}

async function request<T>(
    path: string,
    options: ApiClientOptions = {},
): Promise<T> {
    const { method = "GET", body, headers = {}, cache = "no-store" } = options;

    const response = await fetch(`/api/proxy/${path}`, {
        method,
        cache,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        let message: string;
        if (typeof data === 'object' && data && 'message' in data) {
            const m = (data as any).message;
            message = Array.isArray(m) ? m.join('; ') : String(m);
        } else if (typeof data === 'string') {
            message = data;
        } else {
            message = `Request failed with status ${response.status}`;
        }

        throw new ApiError(message, response.status, data);
    }

    return data as T;
}

export const apiClient = {
    get: <T>(path: string, headers?: Record<string, string>) =>
        request<T>(path, { method: "GET", headers }),

    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, { method: "POST", body, headers }),

    search: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, { method: "SEARCH", body, headers }),

    put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, { method: "PUT", body, headers }),

    patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, { method: "PATCH", body, headers }),

    delete: <T>(path: string, headers?: Record<string, string>) =>
        request<T>(path, { method: "DELETE", headers }),
};

export { ApiError };
