// components/DetailView/DetailView.tsx
import * as React from "react";
import type { RecordModuleDefinition, DetailContext } from "@core/registry/types";
import type { ContextItem, AuditFeedItem } from "@core/components/DetailView/MetaDataView/types";
import { DetailShell } from "@core/components/DetailView/DetailShell";
import { DetailHeader } from "@core/components/DetailView/DetailHeader";
import { DetailSections } from "@core/components/DetailView/DetailSections";
import { RelationCard } from "@core/components/DetailView/RelationView/RelationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";

interface DetailViewProps<T> {
    moduleDefinition: RecordModuleDefinition<T>;
    record: T;
    recordId: string;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
    /** título da página já fica no AppTopbar — aqui só ações secundárias da tela de detalhe. */
    toolbar?: React.ReactNode;
    /** Permissão de update já resolvida pelo chamador — liga o botão "Editar" do header. */
    canEdit?: boolean;
    /** `?mode=edit` já resolvido pelo chamador — troca as seções `editable` pelo FormView. */
    isEditing?: boolean;
    /** Trigger do MetaDataSidebar no formato ícone, pro header (só usado quando `header` existe). */
    metadataSidebar?: React.ReactNode;
}

const OVERVIEW_TAB_KEY = "overview";

/**
 * Motor de composição da tela de detalhe.
 * Não sabe renderizar formulário, metadata ou relations — só sabe
 * PERGUNTAR ao moduleDefinition.detailLayout o que colocar em cada slot,
 * e entregar esse resultado para o DetailShell (o "casco" visual da Fase 6/7).
 */
export async function DetailView<T>({
    moduleDefinition,
    record,
    recordId,
    contextItems,
    auditItems,
    toolbar,
    canEdit,
    isEditing,
    metadataSidebar,
}: DetailViewProps<T>) {
    const layout = moduleDefinition.detailLayout;

    if (!layout) {
        throw new Error(
            `Módulo "${moduleDefinition.model}" não define detailLayout. ` +
            `Adicione detailLayout ao contrato antes de usar DetailView.`
        );
    }

    const context: DetailContext<T> = { record, contextItems, auditItems };
    // `relations` pode ser async (ex.: Feedback busca a contagem real de comentários pro
    // badge da aba) — módulos com retorno síncrono continuam funcionando sem mudança.
    const relationTabs = (await layout.relations?.(context)) ?? [];
    const relationsSlot = relationTabs.length > 0 ? <RelationCard tabs={relationTabs} /> : null;

    if (layout.header) {
        const headerConfig = layout.header(context);
        const extraTabs = layout.tabs ?? [];
        // `sections` é o caminho novo (grid de SectionCard); módulos com `header` mas sem
        // `sections` (não deveria existir na prática, mas o tipo permite) caem em `main`.
        const overviewSlot = layout.sections ? (
            <DetailSections
                sections={layout.sections}
                context={context}
                formFields={moduleDefinition.formFields}
                model={moduleDefinition.model}
                recordId={recordId}
                isEditing={Boolean(isEditing)}
            />
        ) : (
            (layout.main?.(context) ?? null)
        );

        return (
            <DetailShell toolbar={toolbar}>
                <Tabs defaultValue={OVERVIEW_TAB_KEY}>
                    <DetailHeader
                        config={headerConfig}
                        moduleLabel={moduleDefinition.label}
                        editHref={canEdit ? (isEditing ? "?" : "?mode=edit") : undefined}
                        isEditing={isEditing}
                        metadataSidebar={metadataSidebar}
                        tabsList={
                            extraTabs.length > 0 ? (
                                <TabsList variant="line" className="w-full justify-start">
                                    <TabsTrigger value={OVERVIEW_TAB_KEY}>Visão geral</TabsTrigger>
                                    {extraTabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <TabsTrigger key={tab.key} value={tab.key}>
                                                {Icon ? <Icon className="size-4" /> : null}
                                                {tab.label}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            ) : undefined
                        }
                    />

                    <div className="mt-4">
                        <TabsContent value={OVERVIEW_TAB_KEY}>{overviewSlot}</TabsContent>
                        {extraTabs.map((tab) => (
                            <TabsContent key={tab.key} value={tab.key}>
                                {tab.content(context)}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>

                {relationsSlot}
            </DetailShell>
        );
    }

    // Caminho antigo — módulos que ainda não migraram para `header`/`sections` (users, roles,
    // permissions, tenants): main/side/bottom como sempre, sem alteração de comportamento.
    const mainSlot = layout.main?.(context) ?? null;
    const sideSlot = layout.side?.(context) ?? null;
    const bottomSlot = layout.bottom?.(context) ?? null;

    return (
        <DetailShell toolbar={toolbar}>
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex-1 space-y-6">
                    {mainSlot}
                    {relationsSlot}
                    {bottomSlot}
                </div>

                {sideSlot ? (
                    <aside className="w-full lg:w-[360px] shrink-0">
                        {sideSlot}
                    </aside>
                ) : null}
            </div>
        </DetailShell>
    );
}
