// Funções puras de leitura de erro, usadas pelas Server Actions de
// `actions.ts`. Precisam viver fora desse arquivo: todo export de um módulo
// `"use server"` tem que ser uma Server Action (função assíncrona) — uma
// função pura exportada de lá quebra o build ("Server Actions must be
// async functions").

export function resolveActionErrorMessage(error: unknown): string {
    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === "object") {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === "string") {
            return maybeMessage;
        }

        if (Array.isArray(maybeMessage)) {
            return maybeMessage.filter((item): item is string => typeof item === "string").join("; ");
        }

        const maybeData = (error as { data?: { message?: unknown } }).data;
        if (maybeData && typeof maybeData.message === "string") {
            return maybeData.message;
        }
    }

    return "Não foi possível criar o registro.";
}

// D5 (docs/PLAN-fundacao-ux.md): o backend devolve `{ details: { errors: [{
// field, message }] } }` (ver backend/src/core/common/validation-error.util.ts
// e tenant.service.ts) — esta função extrai esse formato do erro capturado
// pela Server Action, pra qualquer action poder popular `fieldErrors` em
// vez de só uma mensagem genérica de banner.
export function resolveActionFieldErrors(error: unknown): Record<string, string> | undefined {
    if (!error || typeof error !== "object") return undefined;

    const data = (error as { data?: unknown }).data;
    if (!data || typeof data !== "object") return undefined;

    const details = (data as { details?: unknown }).details;
    if (!details || typeof details !== "object") return undefined;

    const errors = (details as { errors?: unknown }).errors;
    if (!Array.isArray(errors)) return undefined;

    const fieldErrors: Record<string, string> = {};
    for (const item of errors) {
        if (
            item &&
            typeof item === "object" &&
            typeof (item as { field?: unknown }).field === "string" &&
            typeof (item as { message?: unknown }).message === "string"
        ) {
            fieldErrors[(item as { field: string }).field] = (item as { message: string }).message;
        }
    }

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}
