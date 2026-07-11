export interface ApiErrorPayload {
    message?: string | string[];
    error?: string;
    statusCode?: number;
}

export class ApiError extends Error {
    status: number;
    details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

export function toErrorMessage(error: unknown, fallback: string): string {
    if (!error) {
        return fallback;
    }

    if (error instanceof ApiError) {
        return error.message || fallback;
    }

    if (error instanceof Error) {
        return error.message || fallback;
    }

    return fallback;
}