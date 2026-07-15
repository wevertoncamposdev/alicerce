// lib/api-client.ts

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiClientOptions = {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    cache?: RequestCache;
};

class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
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
        const message =
            typeof data === "object" && data && "message" in data
                ? String((data as { message: unknown }).message)
                : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, data);
    }

    return data as T;
}

export const apiClient = {
    get: <T>(path: string, headers?: Record<string, string>) =>
        request<T>(path, { method: "GET", headers }),

    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, { method: "POST", body, headers }),

    put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, { method: "PUT", body, headers }),

    patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        request<T>(path, { method: "PATCH", body, headers }),

    delete: <T>(path: string, headers?: Record<string, string>) =>
        request<T>(path, { method: "DELETE", headers }),
};

export { ApiError };
