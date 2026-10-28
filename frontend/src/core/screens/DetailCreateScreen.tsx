// screens/DetailCreateScreen.tsx
import { getModule } from "@core/registry";
import { AppTopbar } from "@core/components/Layout/AppTopbar";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@core/components/Layout/AutoSaveIndicator";
import { Card } from "@components/ui/card";
import { SectionCard } from "@core/components/DetailView/SectionCard";
import { DraftProvider, DraftSectionFields } from "@core/components/DetailView/DraftProvider";
import { groupSectionsByColumn } from "@core/components/DetailView/sectionGrid";
import type { DetailSection, FormFieldConfig } from "@core/registry/types";

/**
 * "Novo" com `createMode: "detail"` (ADR 0005): mesmo casco do Detail, mas o registro
 * ainda não existe. Sem botão de Metadados (nada pra ver ainda) e sem Relation card de
 * verdade (nada pra relacionar ainda). Um único `DraftProvider` (ver DraftProvider.tsx)
 * envolve todas as seções — autosave único, dispara quando o campo `primary` perde o
 * foco, independente de em qual seção ele esteja.
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

                <DraftProvider<Record<string, unknown>> model={moduleName} fields={mod.formFields}>
                    {sections && sections.length > 0 ? (
                        <DraftSectionsGrid formFields={mod.formFields} sections={sections} />
                    ) : (
                        <SectionCard title="Detalhes">
                            <DraftSectionFields<Record<string, unknown>> fields={mod.formFields} />
                        </SectionCard>
                    )}
                </DraftProvider>

                <Card className="p-5 text-sm text-muted-foreground">
                    Salve o registro para adicionar relacionamentos.
                </Card>
            </div>
        </AutoSaveStatusProvider>
    );
}

function DraftSectionsGrid({
    formFields,
    sections,
}: {
    formFields: FormFieldConfig<Record<string, unknown>>[];
    sections: DetailSection<Record<string, unknown>>[];
}) {
    const { columns, usedColumns, gridColsClass } = groupSectionsByColumn(sections);

    return (
        <div className={`grid grid-cols-1 items-start gap-4 ${gridColsClass}`}>
            {usedColumns.map((col) => (
                <div key={col} className="flex flex-col gap-4">
                    {columns.get(col)!.map((section) => {
                        const fieldNames = section.fields ?? [];
                        const sectionFormFields = formFields.filter((field) => fieldNames.includes(field.name));
                        return (
                            <SectionCard key={section.key} title={section.title} icon={section.icon}>
                                <DraftSectionFields<Record<string, unknown>> fields={sectionFormFields} />
                            </SectionCard>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
