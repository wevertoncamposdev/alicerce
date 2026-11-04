// components/DetailView/FieldList.tsx
import * as React from "react";
import type { FormFieldConfig } from "@core/registry/types";
import { FieldGrid } from "@core/components/DetailView/FieldGrid";
import { maskDigitsForType, onlyDigits, resolveDocumentMaskType, splitListValue } from "@components/TypeView/FormView/FormView";
import { Badge } from "@components/ui/badge";

type FieldListProps<T> = {
    record: T;
    fields: (keyof T & string)[];
    formFields: FormFieldConfig<T>[];
};

const MONEY_DISPLAY_FORMAT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function resolveDisplayValue<T>(
    field: FormFieldConfig<T>,
    rawValue: unknown,
    record: T,
): string {
    const { type, options } = field;
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

    if ((type === "cpf" || type === "cnpj" || type === "phone") && typeof rawValue === "string" && rawValue) {
        return maskDigitsForType(type, onlyDigits(rawValue));
    }

    if (type === "document" && typeof rawValue === "string" && rawValue) {
        const siblingValue = field.conditionalType ? String(record[field.conditionalType] ?? "") : undefined;
        const maskType = resolveDocumentMaskType(siblingValue);
        return maskType ? maskDigitsForType(maskType, onlyDigits(rawValue)) : onlyDigits(rawValue);
    }

    if (rawValue === null || rawValue === undefined || rawValue === "") return "";
    return String(rawValue);
}

/** `tags`/`multiselect` guardam os valores separados por vírgula na mesma string
 * (ver `FormView.tsx`, `TagsFieldInput`/`MultiselectFieldInput`) — na leitura isso
 * vira chips, não texto corrido. `multiselect` resolve o rótulo via `field.options`
 * (igual ao `select`); `tags` mostra o valor cru. */
function labelForListItem<T>(field: FormFieldConfig<T>, item: string): string {
    if (field.type !== "multiselect" || !field.options) return item;
    const match = field.options.find((option) => (typeof option === "string" ? option === item : option.value === item));
    if (!match) return item;
    return typeof match === "string" ? match : match.label;
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
                if (field.type === "tags" || field.type === "multiselect") {
                    const items = splitListValue(String(record[field.name as keyof T] ?? ""));
                    if (items.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
                    return (
                        <div className="flex flex-wrap gap-1.5">
                            {items.map((item) => (
                                <Badge key={item} variant="secondary">
                                    {labelForListItem(field, item)}
                                </Badge>
                            ))}
                        </div>
                    );
                }

                const value = resolveDisplayValue(field, record[field.name as keyof T], record);
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
