'use client';

import * as React from "react";
import { useActionState } from "react";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { useAutoSaveController } from "@/hooks/use-autosave-controller";
import { autoSaveRecord } from "@lib/registry/actions";
import type { FormFieldConfig } from "@lib/registry/types";

type ActionState = { ok: boolean; message?: string };

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

function CreateFormView<T extends object>({
    fields,
    action,
}: {
    fields: FormFieldConfig<T>[];
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
    const [state, formAction, isPending] = useActionState(action, { ok: true, message: "" });

    return (
        <form action={formAction} className="flex flex-col gap-2 mt-4 border p-4 rounded-lg shadow-md">
            {fields.map((field) => (
                <Input key={field.name} name={field.name} placeholder={field.label} required={field.required} />
            ))}
            <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar"}
            </Button>
            {state.message && <p>{state.message}</p>}
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
    const [error, setError] = React.useState<string | null>(null);

    const editableKeys = React.useMemo(() => fields.map((f) => f.name), [fields]);

    function pickEditableFields(source: T): Partial<T> {
        const result: Partial<T> = {};
        for (const key of editableKeys) {
            result[key] = source[key];
        }
        return result;
    }

    const { saving, commitField } = useAutoSaveController<Partial<T>>({
        draft: pickEditableFields(values),
        onSave: (draft) => autoSaveRecord<Partial<T>>(model, recordId, draft),
        onError: (err) => {
            console.error("[autosave]", err);
            setError("Falha ao salvar. Tentando novamente na próxima alteração.");
        },
    });

    function handleChange(name: keyof T & string, value: string) {
        setError(null);
        setValues((prev) => ({ ...prev, [name]: value }));
    }

    return (
        <div className="flex flex-col gap-2 mt-4 border p-4 rounded-lg shadow-md">
            {fields.map((field) => (
                <Input
                    key={field.name}
                    name={field.name}
                    value={(values[field.name] as string) ?? ""}
                    placeholder={field.label}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    onBlur={commitField}
                />
            ))}
            <p className="text-xs text-muted-foreground">
                {saving ? "Salvando..." : error ?? "Salvo"}
            </p>
        </div>
    );
}