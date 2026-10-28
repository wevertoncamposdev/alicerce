'use server';

import { createDataProvider } from "@core/data-provider";
import { getModule } from "@core/registry";
import { validateFormPayload } from "@core/registry/form-validation";
import { resolveActionErrorMessage, resolveActionFieldErrors } from "@core/registry/action-errors";
import type { FormFieldConfig } from "@core/registry/types";
import type { SearchArgs, SearchResult } from "@core/data-provider/types";
import { apiServer } from "@lib/api-server";

type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

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
        return {
            ok: false,
            message: resolveActionErrorMessage(err),
            fieldErrors: resolveActionFieldErrors(err),
        };
    }
}


type CreateDraftResult =
    | { ok: true; id: string }
    | { ok: false; message: string; fieldErrors?: Record<string, string> };

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
        return {
            ok: false,
            message: resolveActionErrorMessage(err),
            fieldErrors: resolveActionFieldErrors(err),
        };
    }
}

export type AutoSaveResult<T> =
    | { ok: true; data: T }
    | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Server Action genérica para autosave de campo/registro.
 * Não é específica de "favorites" — qualquer módulo registrado
 * no Registry (Fase 4) pode usá-la, desde que tenha dataHandlers.update.
 *
 * Propositalmente NÃO chama revalidatePath (ver decisão 3.4 da Fase 5):
 * o estado do formulário é local (client), o servidor só precisa persistir.
 *
 * D5 (docs/PLAN-fundacao-ux.md): esta era a única action deste arquivo que
 * deixava o erro atravessar a fronteira do Server Action por `throw` em vez
 * de capturar e devolver um resultado — um erro lançado aqui chega no
 * client sem detalhe nenhum (Next esconde a mensagem de erro de Server
 * Action fora de dev). Agora sempre resolve, igual `createRecordFormAction`/
 * `createRecordDraftAction`.
 */
export async function autoSaveRecord<T extends object>(
    model: string,
    id: string,
    patch: Partial<T>,
): Promise<AutoSaveResult<T>> {
    try {
        const dataProvider = createDataProvider();
        const data = await dataProvider.update<T>(model, id, patch);
        return { ok: true, data };
    } catch (err) {
        console.error("[autoSaveRecord]", err);
        return {
            ok: false,
            message: resolveActionErrorMessage(err),
            fieldErrors: resolveActionFieldErrors(err),
        };
    }
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

/**
 * Server Action de upload (Fase 6, ADR 0010) — usada pelo campo `type:
 * "image"` do FormView. `/files` é infraestrutura genérica (não um recurso
 * por módulo), por isso chama `apiServer` direto daqui em vez de passar
 * por um `config/provider.ts` de módulo.
 */
export async function uploadFileAction(formData: FormData): Promise<{ id: string; mime: string }> {
    return apiServer.upload<{ id: string; mime: string }>("files", formData);
}