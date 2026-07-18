'use server';

import { createDataProvider } from "@lib/data-provider";
import { getModule } from "@lib/registry";
type ActionState = { ok: boolean; message?: string };

export async function createRecordFormAction(
    model: string,
    fieldNames: string[],
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    try {
        const { dataHandlers } = getModule(model);

        if (!dataHandlers.create) {
            return { ok: false, message: `Módulo "${model}" é somente leitura.` };
        }

        const payload: Record<string, unknown> = {};
        for (const name of fieldNames) {
            payload[name] = formData.get(name);
        }

        await dataHandlers.create(payload);
        return { ok: true, message: "Criado com sucesso." };
    } catch (err) {
        console.error("[createRecordFormAction]", err);
        return { ok: false, message: "Não foi possível criar o registro." };
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