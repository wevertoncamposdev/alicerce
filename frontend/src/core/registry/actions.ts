'use server';

import { createDataProvider } from "@core/data-provider";
import { getModule } from "@core/registry";
import { validateFormPayload } from "@core/registry/form-validation";
import type { FormFieldConfig } from "@core/registry/types";
import type { SearchArgs, SearchResult } from "@core/data-provider/types";

type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

function resolveActionErrorMessage(error: unknown): string {
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

export async function createRecordFormAction(
    model: string,
    fields: FormFieldConfig<Record<string, unknown>>[],
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    try {
        const { dataHandlers } = getModule(model);

        if (!dataHandlers.create) {
            return { ok: false, message: `Módulo "${model}" é somente leitura.` };
        }

        const payload: Record<string, unknown> = {};
        for (const field of fields) {
            payload[field.name] = formData.get(field.name) ?? "";
        }

        const validation = validateFormPayload(fields, payload);
        if (!validation.ok) {
            return {
                ok: false,
                message: "Corrija os campos destacados.",
                fieldErrors: validation.fieldErrors,
            };
        }

        await dataHandlers.create(payload);
        return { ok: true, message: "Criado com sucesso." };
    } catch (err) {
        console.error("[createRecordFormAction]", err);
        return { ok: false, message: resolveActionErrorMessage(err) };
    }
}


type CreateDraftResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Server Action pro fluxo de criação pelo Detail (ADR 0005, "Novo" com
 * `createMode: "detail"`): cria o registro quando o campo `primary` perde o
 * foco. Não valida o payload (igual `autoSaveRecord`) — quem chama
 * (`FormView mode="draft"`) já validou via `validateFormPayload` antes.
 */
export async function createRecordDraftAction(
    model: string,
    payload: Record<string, unknown>,
): Promise<CreateDraftResult> {
    try {
        const { dataHandlers } = getModule(model);

        if (!dataHandlers.create) {
            return { ok: false, message: `Módulo "${model}" é somente leitura.` };
        }

        const created = await dataHandlers.create(payload);
        const id = (created as { id?: string }).id;
        if (!id) {
            return { ok: false, message: "Registro criado sem id — não é possível continuar a edição." };
        }

        return { ok: true, id };
    } catch (err) {
        console.error("[createRecordDraftAction]", err);
        return { ok: false, message: resolveActionErrorMessage(err) };
    }
}

/**
 * Server Action genérica para autosave de campo/registro.
 * Não é específica de "favorites" — qualquer módulo registrado
 * no Registry (Fase 4) pode usá-la, desde que tenha dataHandlers.update.
 *
 * Propositalmente NÃO chama revalidatePath (ver decisão 3.4 da Fase 5):
 * o estado do formulário é local (client), o servidor só precisa persistir.
 */
export async function autoSaveRecord<T extends object>(
    model: string,
    id: string,
    patch: Partial<T>,
): Promise<T> {
    const dataProvider = createDataProvider();
    return dataProvider.update<T>(model, id, patch);
}

/**
 * Server Action genérica de busca — usada pelo `RelationPicker` (client)
 * pra buscar um registro relacionado sem precisar de `apiClient`/proxy BFF.
 * Mesmo `DataProvider.search` que os Server Components já usam.
 */
export async function searchRecordsAction<T>(model: string, args: SearchArgs): Promise<SearchResult<T>> {
    const dataProvider = createDataProvider();
    return dataProvider.search<T>(model, args);
}