'use client';

import * as React from "react";
import { useActionState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
import { Select } from "@components/ui/select";
import { Checkbox } from "@components/ui/checkbox";
import { Switch } from "@components/ui/switch";
import { Button } from "@components/ui/button";
import { useAutoSaveController } from "@/hooks/use-autosave-controller";
import { autoSaveRecord, uploadFileAction } from "@core/registry/actions";
import { validateFormPayload } from "@core/registry/form-validation";
import { resizeImageToWebp } from "@lib/resize-image";
import type { FormFieldConfig } from "@core/registry/types";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import { useCreateSheetContext } from "@/contexts/create-sheet-context";
import { Label } from "@components/ui/label";

export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

type FormViewProps<T extends object> =
    | {
        mode: "create";
        fields: FormFieldConfig<T>[];
        createAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
    }
    | {
        mode: "edit";
        fields: FormFieldConfig<T>[];
        model: string;
        recordId: string;
        initialValues: T;
        /** `"inline"` usa o grid label-à-esquerda do FieldList (detail page). Default `"stacked"`. */
        layout?: "stacked" | "inline";
    };

export function FormView<T extends object>(props: FormViewProps<T>) {
    if (props.mode === "create") {
        return <CreateFormView fields={props.fields} action={props.createAction} />;
    }
    return (
        <EditFormView
            fields={props.fields}
            model={props.model}
            recordId={props.recordId}
            initialValues={props.initialValues}
            layout={props.layout ?? "stacked"}
        />
    );
}

// Checkbox/Switch (Radix) usam `checked`/`onCheckedChange`, não `value`/`onChange`
// como os demais campos — por fora, ainda falam a mesma "língua" de string (o
// resto do FormView trata todo valor de campo como string) via um hidden input,
// pra funcionar tanto dentro do <form> nativo do create (FormData) quanto do
// estado controlado do edit.
function BooleanFieldInput({
    name,
    type,
    defaultChecked,
    checked,
    onCheckedChange,
}: {
    name: string;
    type: "checkbox" | "switch";
    defaultChecked?: boolean;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}) {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
    const isControlled = checked !== undefined;
    const currentChecked = isControlled ? checked : internalChecked;

    function handleChange(next: boolean) {
        if (!isControlled) setInternalChecked(next);
        onCheckedChange?.(next);
    }

    const Comp = type === "switch" ? Switch : Checkbox;

    return (
        <>
            <input type="hidden" name={name} value={currentChecked ? "true" : "false"} />
            <Comp id={name} checked={currentChecked} onCheckedChange={handleChange} />
        </>
    );
}

// Upload (Fase 6, ADR 0010): o campo guarda o `fileId` (FK), não a URL — o
// preview vem de `record[field.previewField]` (resolvida pelo backend em
// request-time; etapa 12.3 — era uma função `previewUrl(record)`, não
// serializável Server→Client, corrige C2). Só funciona no modo edit
// (precisa de `record`+`onChange`+`onBlur`); `CreateFormView` não passa
// `record`, então o campo não renderiza nada criável ainda (nenhum
// módulo usa "image" em criação nesta fase).
function ImageFieldInput<T extends object>({
    field,
    record,
    onChange,
    onBlur,
    disabled,
}: {
    field: FormFieldConfig<T>;
    record?: T;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
}) {
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const previewValue = record && field.previewField ? record[field.previewField] : undefined;
    const previewUrl = typeof previewValue === "string" ? previewValue : undefined;

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setUploading(true);
        setError(null);
        try {
            // D7 (docs/PLAN-fundacao-ux.md): reduz pra ~512px/WebP antes de
            // subir — além de mais leve pra exibir, evita bater no limite de
            // tamanho de Server Action na maioria dos casos (foto de câmera
            // de celular facilmente passa de 1 MB).
            const resized = await resizeImageToWebp(file);

            const formData = new FormData();
            // `ownerType` precisa vir ANTES de `file` (ver file.controller.ts
            // no backend — @fastify/multipart só acumula `.fields` com o que
            // leu antes do primeiro arquivo).
            if (field.uploadOwnerType) formData.append("ownerType", field.uploadOwnerType);
            formData.append("file", resized);

            const uploaded = await uploadFileAction(formData);
            // `flushSync`: sem isso, `onChange` só aplica o novo valor no
            // próximo ciclo de render — o `onBlur` (autosave) chamado em
            // seguida ainda leria o estado antigo (sem o fileId novo) e
            // nunca persistiria o upload. Com input de texto normal isso
            // não acontece porque o blur de verdade do navegador só chega
            // depois do render; aqui os dois disparam sintéticos, um atrás
            // do outro, sem esse intervalo.
            flushSync(() => {
                onChange?.(uploaded.id);
            });
            onBlur?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao enviar arquivo.");
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="flex items-center gap-3">
            {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview de upload, não é um asset estático do Next
                <img src={previewUrl} alt="" className="size-12 rounded-full object-cover" />
            ) : null}
            <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={disabled || uploading || !record}
                onChange={handleFileChange}
                className="text-sm"
            />
            {uploading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
    );
}

function renderFieldInput<T extends object>(
    field: FormFieldConfig<T>,
    opts: {
        value?: string;
        defaultValue?: string;
        onChange?: (value: string) => void;
        onBlur?: () => void;
        variant: "default" | "inline-detail";
        invalid?: boolean;
        /** Textarea só: borda só em hover/focus + caixa compacta (sem rows fixo) — detail page inline. */
        compactTextarea?: boolean;
        /** Só "image": o registro completo, pra ler `record[field.previewField]`. */
        record?: T;
        disabled?: boolean;
    },
) {
    const { value, defaultValue, onChange, onBlur, variant, invalid, compactTextarea, record, disabled } = opts;

    if (field.type === "image") {
        return (
            <ImageFieldInput field={field} record={record} onChange={onChange} onBlur={onBlur} disabled={disabled} />
        );
    }

    if (field.type === "checkbox" || field.type === "switch") {
        return (
            <BooleanFieldInput
                name={field.name}
                type={field.type}
                defaultChecked={defaultValue === "true"}
                checked={value !== undefined ? value === "true" : undefined}
                onCheckedChange={onChange ? (checked) => onChange(checked ? "true" : "false") : undefined}
            />
        );
    }

    // Base comum a Input/Textarea — `variant` fica de fora porque Textarea não
    // tem variantes de borda (sempre multi-linha, precisa de contorno visível
    // mesmo dentro do modo "inline-detail" do edit).
    const sharedProps = {
        id: field.name,
        name: field.name,
        placeholder: field.placeholder,
        required: field.required,
        className: "flex-1 min-w-0",
        value,
        defaultValue,
        "aria-invalid": invalid || undefined,
        onChange: onChange
            ? (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value)
            : undefined,
        onBlur,
    };

    // Enter confirma o campo (blur força o commit via onBlur) — só pra Input/Select;
    // em textarea, Enter é quebra de linha.
    const onEnterBlur = onBlur
        ? (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
            if (event.key === "Enter") event.currentTarget.blur();
        }
        : undefined;

    if (field.type === "textarea") {
        if (compactTextarea) {
            return (
                <Textarea
                    {...sharedProps}
                    rows={1}
                    className="min-h-[1.75rem] flex-1 min-w-0 resize-none rounded-none border-0 border-b border-transparent bg-transparent px-0 py-1 shadow-none hover:border-border/70 focus-visible:border-foreground focus-visible:ring-0 dark:bg-transparent"
                />
            );
        }
        return <Textarea {...sharedProps} rows={4} />;
    }

    if (field.type === "select") {
        const currentValue = value ?? defaultValue ?? "";
        const options = (field.options ?? []).map((option) =>
            typeof option === "string" ? { label: option, value: option } : option,
        );
        // controlled (edit, onChange presente) usa `value`; uncontrolled (create)
        // usa `defaultValue` — nunca os dois ao mesmo tempo (React reclama em
        // runtime se um <select> receber ambos).
        const controlledProps = onChange ? { value: currentValue } : { defaultValue: currentValue };

        return (
            <Select
                id={field.name}
                name={field.name}
                variant={variant}
                required={field.required}
                aria-invalid={invalid || undefined}
                {...controlledProps}
                onChange={(event) => onChange?.(event.target.value)}
                onBlur={onBlur}
                onKeyDown={onEnterBlur}
                options={[{ label: "Selecione...", value: "" }, ...options]}
            />
        );
    }

    return <Input {...sharedProps} variant={variant} type={field.type ?? "text"} onKeyDown={onEnterBlur} />;
}

function FieldErrorText({ error }: { error?: string }) {
    if (!error) return null;
    return <p className="text-xs text-destructive">{error}</p>;
}

/** Grid label-à-esquerda do FieldList (docs/ui/detail-page.md §3) — usado por `mode="edit"
 * layout="inline"` e pelo `DraftProvider` (criação pelo Detail, ver DraftProvider.tsx). */
export function InlineFieldsGrid<T extends object>({
    fields,
    values,
    record,
    fieldErrors,
    saving,
    onChange,
    onBlur,
}: {
    fields: FormFieldConfig<T>[];
    values: Record<string, string>;
    /** Registro completo (não stringificado) — só usado por campos `type: "image"`, pra ler `record[field.previewField]`. */
    record?: T;
    fieldErrors: Record<string, string>;
    saving: boolean;
    onChange: (name: keyof T & string, value: string) => void;
    /** Recebe o campo que disparou o blur — quem chama decide o que fazer com isso
     * (ex.: DraftFormView usa pra saber qual campo focar depois do redirect). */
    onBlur: (name: keyof T & string) => void;
}) {
    return (
        <div className="grid grid-cols-[minmax(110px,40%)_1fr] items-start gap-x-4 gap-y-2.5 text-sm">
            {fields.map((field) => {
                const error = fieldErrors[field.name];
                const input = renderFieldInput(field, {
                    value: values[field.name] ?? "",
                    variant: "inline-detail",
                    invalid: Boolean(error),
                    compactTextarea: field.type === "textarea",
                    record,
                    disabled: saving,
                    onChange: (value) => onChange(field.name, value),
                    onBlur: () => onBlur(field.name),
                });
                const label = (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Label htmlFor={field.name}>{field.label}</Label>
                        {saving ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : null}
                    </div>
                );

                if (field.type === "textarea") {
                    return (
                        <div key={field.name} className="col-span-2 space-y-1">
                            {label}
                            {input}
                            <FieldErrorText error={error} />
                        </div>
                    );
                }

                return (
                    <React.Fragment key={field.name}>
                        <div className="pt-1.5">{label}</div>
                        <div className="space-y-1">
                            {input}
                            <FieldErrorText error={error} />
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function CreateFormView<T extends object>({
    fields,
    action,
}: {
    fields: FormFieldConfig<T>[];
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
    const [state, formAction, isPending] = useActionState(action, { ok: true, message: "" });
    const { onCreateSuccess } = useCreateSheetContext();

    // `state.ok` já é `true` no estado inicial do useActionState (antes de
    // qualquer submit) — por isso o sinal de "sucesso real" é `ok && message`
    // não vazia, que só acontece depois de uma resposta de verdade do servidor.
    React.useEffect(() => {
        if (state.ok && state.message) {
            onCreateSuccess?.();
        }
    }, [state, onCreateSuccess]);

    return (
        <form action={formAction} className="flex flex-col gap-2 mt-4">
            {fields.map((field) => {
                const error = state.fieldErrors?.[field.name];
                return (
                    <div key={field.name} className="flex flex-col gap-1">
                        <Label htmlFor={field.name}>{field.label}</Label>
                        {renderFieldInput(field, { defaultValue: "", variant: "default", invalid: Boolean(error) })}
                        <FieldErrorText error={error} />
                    </div>
                );
            })}
            <Button type="submit" disabled={isPending} variant="save" size="sm">
                {isPending ? "Criando..." : "Criar"}
            </Button>
            {state.message && !state.fieldErrors && <p className="text-sm text-muted-foreground">{state.message}</p>}
        </form>
    );
}

function EditFormView<T extends object>({
    fields,
    model,
    recordId,
    initialValues,
    layout,
}: {
    fields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    initialValues: T;
    layout: "stacked" | "inline";
}) {
    const [values, setValues] = React.useState<T>(initialValues);
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
    const { setStatus } = useAutoSaveStatus();
    const router = useRouter();

    const editableFields = React.useMemo(() => fields.filter((field) => !field.createOnly), [fields]);
    const editableKeys = React.useMemo(() => editableFields.map((field) => field.name), [editableFields]);

    function pickEditableFields(source: T): Partial<T> {
        const result: Partial<T> = {};
        for (const key of editableKeys) {
            if (key in source) {
                result[key] = source[key];
            }
        }
        return result;
    }

    const { saving, commitField } = useAutoSaveController<Partial<T>>({
        draft: pickEditableFields(values),
        onSave: async (draft) => {
            const validation = validateFormPayload(editableFields, draft as Record<string, unknown>);
            if (!validation.ok) {
                setFieldErrors(validation.fieldErrors);
                throw new Error("Corrija os campos destacados antes de salvar.");
            }

            setFieldErrors({});
            setStatus("saving");
            const result = await autoSaveRecord<T>(model, recordId, draft);
            if (!result.ok) {
                if (result.fieldErrors) {
                    setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
                }
                throw new Error(result.message);
            }
            setStatus("saved");
            // Client-side, não chama revalidatePath (AGENTS §4.1.8) — só atualiza título do
            // header/breadcrumb/auditoria no servidor sem resetar o estado local do form.
            router.refresh();
            return pickEditableFields(result.data);
        },
        onError: (err) => {
            console.error("[autosave]", err);
            // D5 (docs/PLAN-fundacao-ux.md): a mensagem já vem específica (erro de
            // campo ou validação local) quando `err` é o `Error` que o `onSave`
            // lança — só cai no genérico pra erro de verdade inesperado.
            setStatus("error", err instanceof Error ? err.message : "Falha ao salvar. Tentando novamente na próxima alteração.");
        },
    });

    function handleChange(name: keyof T & string, value: string) {
        setValues((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => {
            if (!(name in prev)) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }

    // Lê `?focus=<campo>` (Etapa 5 — redirect do draft pro registro recém-criado), foca o
    // campo com o cursor no fim e remove o parâmetro sem gerar request novo. Roda em toda
    // seção `editable` da página; só a que realmente tem o campo encontra o elemento. Lê
    // `location.search` direto (não `useSearchParams`) pra não exigir um Suspense boundary
    // só por causa desse efeito client-only.
    React.useEffect(() => {
        const focusField = new URLSearchParams(window.location.search).get("focus");
        if (!focusField) return;

        const el = document.getElementById(focusField) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el && typeof el.focus === "function") {
            el.focus();
            const end = el.value.length;
            el.setSelectionRange?.(end, end);
        }

        const url = new URL(window.location.href);
        url.searchParams.delete("focus");
        window.history.replaceState({}, "", url.toString());
    }, []);

    if (layout === "inline") {
        return (
            <InlineFieldsGrid<T>
                fields={fields}
                values={Object.fromEntries(
                    fields.map((field) => [field.name, String((values[field.name] as string | number | undefined) ?? "")]),
                )}
                record={values}
                fieldErrors={fieldErrors}
                saving={saving}
                onChange={handleChange}
                onBlur={commitField}
            />
        );
    }

    return (
        <div className="w-full">
            {fields.map((field) => {
                const error = fieldErrors[field.name];
                return (
                    <div key={field.name} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={field.name}>{field.label}</Label>
                            {saving ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
                        </div>
                        {renderFieldInput(field, {
                            value: String((values[field.name] as string | number | undefined) ?? ""),
                            variant: "inline-detail",
                            invalid: Boolean(error),
                            record: values,
                            disabled: saving,
                            onChange: (value) => handleChange(field.name, value),
                            onBlur: commitField,
                        })}
                        <FieldErrorText error={error} />
                    </div>
                );
            })}
        </div>
    );
}

