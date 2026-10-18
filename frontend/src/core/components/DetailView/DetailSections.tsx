// components/DetailView/DetailSections.tsx
import * as React from "react";
import type { DetailContext, DetailSection, FormFieldConfig } from "@core/registry/types";
import { SectionCard } from "@core/components/DetailView/SectionCard";
import { FieldList } from "@core/components/DetailView/FieldList";
import { EditableSection } from "@core/components/DetailView/EditableSection";

type DetailSectionsProps<T> = {
    sections: DetailSection<T>[];
    context: DetailContext<T>;
    formFields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    permission?: string;
};

/** Grid de seções (docs/ui/detail-page.md §3) — `column` agrupa, nunca renderiza coluna vazia. */
export function DetailSections<T>({ sections, context, formFields, model, recordId, permission }: DetailSectionsProps<T>) {
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
                                permission={permission}
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
    permission,
}: {
    section: DetailSection<T>;
    context: DetailContext<T>;
    formFields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    permission?: string;
}) {
    if (section.render) return <>{section.render(context)}</>;

    const fields = section.fields ?? [];

    if (section.editable) {
        return (
            <EditableSection
                record={context.record}
                fields={fields}
                formFields={formFields}
                model={model}
                recordId={recordId}
                permission={permission}
            />
        );
    }

    return <FieldList record={context.record} fields={fields} formFields={formFields} />;
}
