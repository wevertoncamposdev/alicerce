// components/Shells/DetailShellEngine.tsx
import * as React from "react";
import type { RecordModuleDefinition, DetailContext } from "@lib/registry/types";
import type { ContextItem, AuditFeedItem } from "@/components/shells/MetaDataShell/types";
import { DetailShell } from "@/components/shells/DetailShell";

interface DetailShellEngineProps<T> {
    moduleDefinition: RecordModuleDefinition<T>;
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
    /** título e descrição visuais — o engine não inventa esses textos */
    title: string;
    description?: string;
    toolbar?: React.ReactNode;
}

/**
 * Motor de composição da tela de detalhe.
 * Não sabe renderizar formulário, metadata ou relations — só sabe
 * PERGUNTAR ao moduleDefinition.detailLayout o que colocar em cada slot,
 * e entregar esse resultado para o DetailShell (o "casco" visual da Fase 6/7).
 */
export function DetailShellEngine<T>({
    moduleDefinition,
    record,
    contextItems,
    auditItems,
    title,
    description,
    toolbar,
}: DetailShellEngineProps<T>) {
    const layout = moduleDefinition.detailLayout;

    if (!layout) {
        throw new Error(
            `Módulo "${moduleDefinition.model}" não define detailLayout. ` +
            `Adicione detailLayout ao contrato antes de usar DetailShellEngine.`
        );
    }

    const context: DetailContext<T> = { record, contextItems, auditItems };

    const mainSlot = layout.main(context);
    const sideSlot = layout.side?.(context) ?? null;
    const bottomSlot = layout.bottom?.(context) ?? null;

    return (
        <DetailShell title={title} description={description} toolbar={toolbar}>
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex-1 space-y-6">
                    {mainSlot}
                    {bottomSlot}
                </div>
                {sideSlot ? <div className="lg:w-80 lg:flex-shrink-0">{sideSlot}</div> : null}
            </div>
        </DetailShell>
    );
}