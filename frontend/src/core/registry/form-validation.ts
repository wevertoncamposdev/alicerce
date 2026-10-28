// lib/registry/form-validation.ts
//
// Validação de formulário derivada do próprio FormFieldConfig[] do módulo —
// não escrevemos um schema zod por módulo, geramos a partir do que o contrato
// já declara (required/type). Usado tanto no create (payload completo) quanto
// no autosave do edit (draft parcial, só os campos que o controller envia).
import { z } from "zod";
import type { FormFieldConfig } from "@core/registry/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Um único `refine` por campo, em vez de encadear builders nativos do zod
// (`.email().min(1)`) — encadeados, a ORDEM em que os checks rodam decide qual
// mensagem aparece quando mais de uma regra falha ao mesmo tempo (ex.: e-mail
// vazio e obrigatório falha tanto o formato quanto o "obrigatório"), e isso não
// é a prioridade que queremos. Aqui a prioridade é explícita: vazio+obrigatório
// sempre vence sobre formato errado.
// `null` (campo esvaziado, ver D2/U0.2 — o autosave manda `null`, nunca "")
// é tratado igual a "" em toda checagem: nenhum dos dois é "preenchido".
function isFieldValueValid<T extends object>(field: FormFieldConfig<T>, value: string | null): boolean {
    const trimmed = value?.trim() ?? "";
    if (field.required && trimmed === "") return false;
    if (trimmed === "") return true;
    if (field.type === "email") return EMAIL_PATTERN.test(trimmed);
    if (field.type === "number") return !Number.isNaN(Number(trimmed));
    return true;
}

function messageForInvalidField<T extends object>(field: FormFieldConfig<T>, value: string | null): string {
    const trimmed = value?.trim() ?? "";
    if (field.required && trimmed === "") return `${field.label} é obrigatório.`;
    if (field.type === "email") return `${field.label}: e-mail inválido.`;
    if (field.type === "number") return `${field.label}: precisa ser um número.`;
    return `${field.label}: valor inválido.`;
}

function fieldSchemaFor<T extends object>(field: FormFieldConfig<T>): z.ZodTypeAny {
    if (field.type === "checkbox" || field.type === "switch") {
        return z.string().nullable().optional();
    }

    // `.refine(check, (value) => ({ message }))` não aplica a mensagem dinâmica
    // no zod 4 (fica "Invalid input") — só `superRefine` + `ctx.addIssue` respeita
    // uma mensagem calculada a partir do valor.
    return z.string().nullable().superRefine((value, ctx) => {
        if (!isFieldValueValid(field, value)) {
            ctx.addIssue({ code: "custom", message: messageForInvalidField(field, value) });
        }
    });
}

export function buildFormSchema<T extends object>(fields: FormFieldConfig<T>[]) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of fields) {
        shape[field.name] = fieldSchemaFor(field);
    }
    // `.partial()`: o create (FormData, via createRecordFormAction) continua
    // mandando todas as chaves, mas o autosave do edit (D2/U0.2) agora manda só
    // o patch com os campos que mudaram desde o último save — chave ausente
    // aqui é "não tocado nesta rodada", não mais um bug do chamador.
    return z.object(shape).partial();
}

export type FieldErrors = Record<string, string>;

/** Valida um payload (create completo, ou draft do autosave do edit) contra os
 * FormFieldConfig[] do módulo. */
export function validateFormPayload<T extends object>(
    fields: FormFieldConfig<T>[],
    payload: Record<string, unknown>,
): { ok: true } | { ok: false; fieldErrors: FieldErrors } {
    const schema = buildFormSchema(fields);
    const result = schema.safeParse(payload);

    if (result.success) {
        return { ok: true };
    }

    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) {
            fieldErrors[key] = issue.message;
        }
    }
    return { ok: false, fieldErrors };
}
