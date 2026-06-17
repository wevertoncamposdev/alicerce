import { ApiError, ApiErrorPayload } from "@/types/api";

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000/api";

interface RequestOptions extends Omit<RequestInit, "body"> {
    token?: string | null;
    tenantId?: string | null;
    body?: unknown;
}

function extractErrorMessage(payload: unknown): string {
    if (typeof payload === "string" && payload.trim()) {
        return payload;
    }

    if (payload && typeof payload === "object") {
        const maybe = payload as ApiErrorPayload;

        if (Array.isArray(maybe.message) && maybe.message.length > 0) {
            return String(maybe.message[0]);
        }

        if (typeof maybe.message === "string" && maybe.message.trim()) {
            return maybe.message;
        }

        if (typeof maybe.error === "string" && maybe.error.trim()) {
            return maybe.error;
        }
    }

    return "Nao foi possivel concluir a solicitacao.";
}

async function parseResponsePayload(response: Response): Promise<unknown> {
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!isJson) {
        return null;
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function apiRequest<T>(
    path: string,
    { token, tenantId, headers, body, ...rest }: RequestOptions = {},
): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const resolvedHeaders: Record<string, string> = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { "x-tenant-id": tenantId } : {}),
        ...(headers as Record<string, string>),
    };

    if (body !== undefined) {
        resolvedHeaders["Content-Type"] = resolvedHeaders["Content-Type"] ?? "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
        ...rest,
        headers: resolvedHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
        throw new ApiError(extractErrorMessage(payload), response.status, payload);
    }

    return payload as T;
}
