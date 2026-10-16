'use client';

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
import { Select } from "@components/ui/select";
import { Checkbox } from "@components/ui/checkbox";
import { Switch } from "@components/ui/switch";
import { Button } from "@components/ui/button";
import { useAutoSaveController } from "@/hooks/use-autosave-controller";
import { autoSaveRecord } from "@core/registry/actions";
import { validateFormPayload } from "@core/registry/form-validation";
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

function renderFieldInput<T extends object>(
    field: FormFieldConfig<T>,
    opts: {
        value?: string;
        defaultValue?: string;
        onChange?: (value: string) => void;
        onBlur?: () => void;
        variant: "default" | "inline-detail";
        invalid?: boolean;
    },
) {
    const { value, defaultValue, onChange, onBlur, variant, invalid } = opts;

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

    if (field.type === "textarea") {
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
                options={[{ label: "Selecione...", value: "" }, ...options]}
            />
        );
    }

    return <Input {...sharedProps} variant={variant} type={field.type ?? "text"} />;
}

function FieldErrorText({ error }: { error?: string }) {
    if (!error) return null;
    return <p className="text-xs text-destructive">{error}</p>;
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
}: {
    fields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    initialValues: T;
}) {
    const [values, setValues] = React.useState<T>(initialValues);
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
    const { setStatus } = useAutoSaveStatus();

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
            const updated = await autoSaveRecord<T>(model, recordId, draft);
            setStatus("saved");
            return pickEditableFields(updated);
        },
        onError: (err) => {
            console.error("[autosave]", err);
            setStatus("error", "Falha ao salvar. Tentando novamente na próxima alteração.");
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
