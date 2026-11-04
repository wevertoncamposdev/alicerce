// components/DetailView/FieldList.tsx
import * as React from "react";
import type { FormFieldConfig } from "@core/registry/types";
import { FieldGrid } from "@core/components/DetailView/FieldGrid";

type FieldListProps<T> = {
    record: T;
    fields: (keyof T & string)[];
    formFields: FormFieldConfig<T>[];
};

const MONEY_DISPLAY_FORMAT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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

    if (type === "money" && rawValue !== null && rawValue !== undefined && rawValue !== "") {
        const cents = Number(rawValue);
        return Number.isFinite(cents) ? MONEY_DISPLAY_FORMAT.format(cents / 100) : String(rawValue);
    }

    if (type === "datetime" && typeof rawValue === "string" && rawValue) {
        const parsed = new Date(rawValue);
        return Number.isNaN(parsed.getTime()) ? rawValue : parsed.toLocaleString("pt-BR");
    }

    if (type === "date" && typeof rawValue === "string" && rawValue) {
        const parsed = new Date(rawValue);
        return Number.isNaN(parsed.getTime()) ? rawValue : parsed.toLocaleDateString("pt-BR");
    }

    if (rawValue === null || rawValue === undefined || rawValue === "") return "";
    return String(rawValue);
}

/** Campos (leitura) — docs/ui/detail-page.md §3. Mesmo grid (`FieldGrid`) da seção editável,
 * só troca input por texto — nunca input/textarea fora do modo edição. */
export function FieldList<T>({ record, fields, formFields }: FieldListProps<T>) {
    const configByName = React.useMemo(() => new Map(formFields.map((f) => [f.name, f])), [formFields]);
    const visibleFields = React.useMemo(
        () => fields.map((name) => configByName.get(name) ?? { name, label: name, type: "text" as const }),
        [fields, configByName],
    );

    return (
        <FieldGrid<T>
            fields={visibleFields as FormFieldConfig<T>[]}
            renderValue={(field) => {
                const value = resolveDisplayValue(field.type, field.options, record[field.name as keyof T]);
                if (field.type === "textarea") {
                    return (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{value || "—"}</p>
                    );
                }
                return <p className="text-sm text-foreground break-words">{value || "—"}</p>;
            }}
        />
    );
}
