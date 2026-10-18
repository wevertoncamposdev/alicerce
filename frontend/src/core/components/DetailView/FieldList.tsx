// components/DetailView/FieldList.tsx
import * as React from "react";
import type { FormFieldConfig } from "@core/registry/types";

type FieldListProps<T> = {
    record: T;
    fields: (keyof T & string)[];
    formFields: FormFieldConfig<T>[];
};

function resolveDisplayValue(
    type: FormFieldConfig<never>["type"] | undefined,
    options: FormFieldConfig<never>["options"],
    rawValue: unknown,
): string {
    if (type === "select" && options) {
        const match = options.find((option) =>
            typeof option === "string" ? option === rawValue : option.value === rawValue,
        );
        if (match) return typeof match === "string" ? match : match.label;
    }

    if (type === "checkbox" || type === "switch") {
        return rawValue === true || rawValue === "true" ? "Sim" : "Não";
    }

    if (rawValue === null || rawValue === undefined || rawValue === "") return "";
    return String(rawValue);
}

/** Campos (leitura) — docs/ui/detail-page.md §3. Nunca input/textarea fora do modo edição. */
export function FieldList<T>({ record, fields, formFields }: FieldListProps<T>) {
    const configByName = React.useMemo(() => new Map(formFields.map((f) => [f.name, f])), [formFields]);

    const regularFields = fields.filter((name) => configByName.get(name)?.type !== "textarea");
    const longTextFields = fields.filter((name) => configByName.get(name)?.type === "textarea");

    return (
        <div className="space-y-4">
            {regularFields.length > 0 ? (
                <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2.5 text-sm">
                    {regularFields.map((name) => {
                        const config = configByName.get(name);
                        const value = resolveDisplayValue(config?.type, config?.options, record[name]);
                        return (
                            <React.Fragment key={name}>
                                <dt className="text-muted-foreground">{config?.label ?? name}</dt>
                                <dd className="text-foreground break-words">{value || "—"}</dd>
                            </React.Fragment>
                        );
                    })}
                </dl>
            ) : null}

            {longTextFields.map((name) => {
                const config = configByName.get(name);
                const value = record[name];
                return (
                    <div key={name}>
                        <div className="mb-1 text-sm text-muted-foreground">{config?.label ?? name}</div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                            {value ? String(value) : "—"}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
