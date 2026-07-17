'use client';

import * as React from "react";
import { useActionState } from "react";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Cloud, CloudUpload, CloudAlert } from "lucide-react";
import { useAutoSaveController } from "@/hooks/use-autosave-controller";
import { autoSaveRecord } from "@lib/registry/actions";
import type { FormFieldConfig } from "@lib/registry/types";
import { useAutoSaveStatus } from "@/contexts/autosave-status-context";
import { Label } from "@components/ui/label";

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
        <form action={formAction} className="flex flex-col gap-2 mt-4">

            {fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-1">
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                        {field.label}
                    </Label>
                    <Input
                        id={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        variant="inline-detail"
                        className="flex-1 min-w-0"
                    />
                </div>
            ))}
            <Button type="submit" disabled={isPending} variant="save" size="sm">
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
    const { setStatus } = useAutoSaveStatus();

    const editableKeys = React.useMemo(() => fields.map((f) => f.name), [fields]);

    function pickEditableFields(source: T): Partial<T> {
        const result: Partial<T> = {};
        for (const key of editableKeys) {
            result[key] = source[key];
        }
        return result;
    }

    const { commitField } = useAutoSaveController<Partial<T>>({
        draft: pickEditableFields(values),
        onSave: async (draft) => {
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
    }

    return (
        <div className="flex flex-col gap-4">
            {fields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                        {field.label}
                    </Label>
                    <Input
                        id={field.name}
                        name={field.name}
                        variant="inline-detail"
                        value={(values[field.name] as string) ?? ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        onBlur={commitField}
                    />
                </div>
            ))}
        </div>
    );
}