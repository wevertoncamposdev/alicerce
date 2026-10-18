// components/DetailView/DetailSections.tsx
import * as React from "react";
import type { DetailContext, DetailSection, FormFieldConfig } from "@core/registry/types";
import { SectionCard } from "@core/components/DetailView/SectionCard";
import { FieldList } from "@core/components/DetailView/FieldList";
import { FormView } from "@components/TypeView/FormView/FormView";

type DetailSectionsProps<T> = {
    sections: DetailSection<T>[];
    context: DetailContext<T>;
    formFields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    isEditing: boolean;
};

/** Grid de seções (docs/ui/detail-page.md §3) — `column` agrupa, nunca renderiza coluna vazia. */
export function DetailSections<T>({ sections, context, formFields, model, recordId, isEditing }: DetailSectionsProps<T>) {
    const columns = new Map<number, DetailSection<T>[]>();
    for (const section of sections) {
        const col = section.column ?? 1;
        if (!columns.has(col)) columns.set(col, []);
        columns.get(col)!.push(section);
    }
    const usedColumns = [...columns.keys()].sort((a, b) => a - b);
    const gridColsClass =
        usedColumns.length >= 3 ? "lg:grid-cols-3" : usedColumns.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

    return (
        <div className={`grid grid-cols-1 items-start gap-4 ${gridColsClass}`}>
            {usedColumns.map((col) => (
                <div key={col} className="flex flex-col gap-4">
                    {columns.get(col)!.map((section) => (
                        <SectionCard key={section.key} title={section.title} icon={section.icon}>
                            <SectionBody
                                section={section}
                                context={context}
                                formFields={formFields}
                                model={model}
                                recordId={recordId}
                                isEditing={isEditing}
                            />
                        </SectionCard>
                    ))}
                </div>
            ))}
        </div>
    );
}

function SectionBody<T>({
    section,
    context,
    formFields,
    model,
    recordId,
    isEditing,
}: {
    section: DetailSection<T>;
    context: DetailContext<T>;
    formFields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    isEditing: boolean;
}) {
    if (section.render) return <>{section.render(context)}</>;

    const fields = section.fields ?? [];

    if (isEditing && section.editable) {
        const sectionFormFields = formFields.filter((field) => fields.includes(field.name));
        return (
            <FormView<Record<string, unknown>>
                mode="edit"
                model={model}
                recordId={recordId}
                fields={sectionFormFields as FormFieldConfig<Record<string, unknown>>[]}
                initialValues={context.record as Record<string, unknown>}
            />
        );
    }

    return <FieldList record={context.record} fields={fields} formFields={formFields} />;
}
