// components/DetailView/DetailView.tsx
import * as React from "react";
import type { RecordModuleDefinition, DetailContext } from "@core/registry/types";
import type { ContextItem, AuditFeedItem } from "@core/components/DetailView/MetaDataView/types";
import { DetailShell } from "@core/components/DetailView/DetailShell";
import { RelationShell } from "@core/components/DetailView/RelationView/RelationShell";

interface DetailViewProps<T> {
    moduleDefinition: RecordModuleDefinition<T>;
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
    /** título da página já fica no AppTopbar — aqui só ações secundárias da tela de detalhe. */
    toolbar?: React.ReactNode;
}

/**
 * Motor de composição da tela de detalhe.
 * Não sabe renderizar formulário, metadata ou relations — só sabe
 * PERGUNTAR ao moduleDefinition.detailLayout o que colocar em cada slot,
 * e entregar esse resultado para o DetailShell (o "casco" visual da Fase 6/7).
 */
export function DetailView<T>({
    moduleDefinition,
    record,
    contextItems,
    auditItems,
    toolbar,
}: DetailViewProps<T>) {
    const layout = moduleDefinition.detailLayout;

    if (!layout) {
        throw new Error(
            `Módulo "${moduleDefinition.model}" não define detailLayout. ` +
            `Adicione detailLayout ao contrato antes de usar DetailView.`
        );
    }

    const context: DetailContext<T> = { record, contextItems, auditItems };

    // `sections` é o caminho novo (header/sections/relations); módulos que ainda não
    // migraram continuam no caminho antigo via `main`. Renderização de `header`/`sections`
    // chega nos próximos commits (ADR 0004) — por ora só mantém os dois caminhos compilando.
    const mainSlot = layout.main?.(context) ?? null;
    const sideSlot = layout.side?.(context) ?? null;
    const bottomSlot = layout.bottom?.(context) ?? null;
    const relationTabs = layout.relations?.(context) ?? [];

    return (
        <DetailShell toolbar={toolbar}>
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex-1 space-y-6">
                    {mainSlot}
                    {relationTabs.length > 0 ? <RelationShell tabs={relationTabs} /> : null}
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