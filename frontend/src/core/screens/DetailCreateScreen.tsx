// screens/DetailCreateScreen.tsx
import { getModule } from "@core/registry";
import { AppTopbar } from "@core/components/Layout/AppTopbar";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@core/components/Layout/AutoSaveIndicator";
import { Card } from "@components/ui/card";
import { SectionCard } from "@core/components/DetailView/SectionCard";
import { FormView } from "@components/TypeView/FormView/FormView";
import type { DetailSection, FormFieldConfig } from "@core/registry/types";

/**
 * "Novo" com `createMode: "detail"` (ADR 0005): mesmo casco do Detail, mas o registro
 * ainda não existe. Sem botão de Metadados (nada pra ver ainda) e sem Relation card de
 * verdade (nada pra relacionar ainda). `FormView mode="draft"` cria o registro quando o
 * campo `primary` perde o foco — ver DraftFormView em components/TypeView/FormView.
 */
export function DetailCreateScreen({ moduleName }: { moduleName: string }) {
    const mod = getModule<Record<string, unknown>>(moduleName);
    const sections = mod.detailLayout?.sections;

    const breadcrumb = [
        { label: mod.label, href: `/${moduleName}` },
        { label: "Novo registro" },
    ];

    return (
        <AutoSaveStatusProvider>
            <AppTopbar title={mod.label} breadcrumb={breadcrumb} autosave={<AutoSaveIndicator />} />
            <div className="mx-auto w-full max-w-[1400px] space-y-4 px-6 py-4">
                <Card className="p-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-muted-foreground">Novo registro</h1>
                </Card>

                {sections && sections.length > 0 ? (
                    <DraftSectionsGrid moduleName={moduleName} formFields={mod.formFields} sections={sections} />
                ) : (
                    <SectionCard title="Detalhes">
                        <FormView<Record<string, unknown>>
                            mode="draft"
                            model={moduleName}
                            fields={mod.formFields}
                        />
                    </SectionCard>
                )}

                <Card className="p-5 text-sm text-muted-foreground">
                    Salve o registro para adicionar relacionamentos.
                </Card>
            </div>
        </AutoSaveStatusProvider>
    );
}

function DraftSectionsGrid({
    moduleName,
    formFields,
    sections,
}: {
    moduleName: string;
    formFields: FormFieldConfig<Record<string, unknown>>[];
    sections: DetailSection<Record<string, unknown>>[];
}) {
    const columns = new Map<number, DetailSection<Record<string, unknown>>[]>();
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
                    {columns.get(col)!.map((section) => {
                        const fieldNames = section.fields ?? [];
                        const sectionFormFields = formFields.filter((field) => fieldNames.includes(field.name));
                        return (
                            <SectionCard key={section.key} title={section.title} icon={section.icon}>
                                <FormView<Record<string, unknown>>
                                    mode="draft"
                                    model={moduleName}
                                    fields={sectionFormFields}
                                />
                            </SectionCard>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
