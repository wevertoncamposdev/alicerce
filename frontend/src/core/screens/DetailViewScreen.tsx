// screens/DetailViewScreen.tsx
import { notFound } from "next/navigation";
import { getModule } from "@core/registry";
import { createDataProvider } from "@core/data-provider";
import { getEntityAuditTrail } from "@core/data-provider/rest/audit";
import { listNotes } from "@core/data-provider/rest/notes";
import { listRecordTags } from "@core/data-provider/rest/tags";
import { listAttachments } from "@core/data-provider/rest/attachments";
import { fieldLabel, actionLabel } from "@core/registry/labels";
import { ApiServerError } from "@lib/api-server";
import { DetailView } from "@core/components/DetailView/DetailView";
import { AppTopbar } from "@core/components/Layout/AppTopbar";
import { PermissionDeniedView } from "@core/components/Layout/PermissionDeniedView";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@core/components/Layout/AutoSaveIndicator";
import { MetaDataSidebar } from "@core/components/DetailView/MetaDataView/MetaDataSidebar";
import { MetaDataView } from "@core/components/DetailView/MetaDataView";
import type {
    AuditFeedItem,
    ContextItem,
    NoteItem,
    TagItem,
    AttachmentItem,
} from "@core/components/DetailView/MetaDataView/types";
import type { DetailContext } from "@core/registry/types";

export async function DetailViewScreen({
    moduleName,
    id,
}: {
    moduleName: string;
    id: string;
}) {
    const mod = getModule(moduleName);
    const dataProvider = createDataProvider();

    let record: Record<string, unknown>;
    try {
        record = await dataProvider.read(moduleName, id);
    } catch (err) {
        if (err instanceof ApiServerError && err.status === 403) {
            return (
                <div>
                    <AppTopbar title={mod.label} />
                    <PermissionDeniedView message={err.message} />
                </div>
            );
        }
        // Etapa 10.4 — id inexistente mostra o not-found.tsx do grupo (app)
        // em vez de cair sem tratamento no error.tsx genérico.
        if (err instanceof ApiServerError && err.status === 404) {
            notFound();
        }
        throw err;
    }

    const entity = normalizeAuditEntityName(moduleName);

    const [contextItems, auditItems, notes, tags, attachments] = await Promise.all([
        resolveContextItems(mod, record),
        resolveAuditItems(mod, moduleName, id, record),
        resolveNotes(mod, moduleName, id, record),
        resolveTags(mod, moduleName, id, record),
        resolveAttachments(mod, moduleName, id, record),
    ]);

    const context: DetailContext<Record<string, unknown>> = { record, contextItems, auditItems };
    const headerConfig = mod.detailLayout?.header?.(context);
    const headerTitle =
        headerConfig?.title ??
        (record.title as string | undefined) ??
        (record.name as string | undefined) ??
        mod.label;
    const breadcrumb = [
        { label: mod.label, href: `/${moduleName}` },
        { label: headerTitle },
    ];

    // `resolveAuditItems` sempre devolve array (`[]` quando desligado) —
    // outro consumidor (`SingletonDetailScreen.tsx`) depende disso. Quem
    // decide se a aba Histórico aparece é só esta tela, via `metadata`/
    // `auditEnabled`/`loadAudit`, igual as outras três abas.
    const historyEnabled = Boolean(
        mod.detailConfig?.loadAudit || mod.detailConfig?.auditEnabled || mod.detailConfig?.metadata?.history,
    );

    const metaDataContent = (
        <MetaDataView
            entity={entity}
            entityId={id}
            contextItems={contextItems}
            auditItems={historyEnabled ? auditItems : undefined}
            historyStatus={headerConfig?.status}
            notes={notes}
            tags={tags}
            attachments={attachments}
        />
    );

    return (
        <AutoSaveStatusProvider>
            <AppTopbar
                title={mod.label}
                breadcrumb={breadcrumb}
                autosave={<AutoSaveIndicator />}
                actions={
                    <>
                        {mod.detailLayout?.toolbar?.(context)}
                        <MetaDataSidebar>{metaDataContent}</MetaDataSidebar>
                    </>
                }
            />
            <div className="mx-auto w-full max-w-[1400px] space-y-4 px-6 py-4">
                <DetailView
                    moduleDefinition={mod}
                    record={record}
                    recordId={id}
                    contextItems={contextItems}
                    auditItems={auditItems}
                />
            </div>
        </AutoSaveStatusProvider>
    );
}

export async function resolveContextItems(mod: ReturnType<typeof getModule>, record: unknown): Promise<ContextItem[]> {
    if (!mod.detailConfig?.loadContext) return [];
    return mod.detailConfig.loadContext(record);
}

export function normalizeAuditEntityName(moduleName: string) {
    const trimmed = moduleName.trim();
    if (!trimmed) return trimmed;
    return trimmed.endsWith("s") ? trimmed.slice(0, -1) : trimmed;
}

// Resumo legível pro item da timeline do Histórico (U2/U6): nomes de
// campo em português via `fieldLabel` (`core/registry/labels.ts`), não a
// chave crua do banco. `entity` decide em qual módulo procurar o rótulo.
function buildAuditSummary(entity: string, action: string, before: unknown, after: unknown): string {
    const beforeObj = before && typeof before === "object" ? (before as Record<string, unknown>) : null;
    const afterObj = after && typeof after === "object" ? (after as Record<string, unknown>) : null;

    if (action === "DELETE") return "Registro removido";
    if (!beforeObj && afterObj) return "Registro criado";
    if (!afterObj) return "—";

    if (beforeObj) {
        const changedFields = Object.keys(afterObj).filter(
            (key) => JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key]),
        );
        if (changedFields.length === 0) return "Nenhum campo alterado";
        return `Campo(s) alterado(s): ${changedFields.map((key) => fieldLabel(entity, key)).join(", ")}`;
    }

    return `Campo(s) definidos: ${Object.keys(afterObj).map((key) => fieldLabel(entity, key)).join(", ")}`;
}

export async function resolveAuditItems(
    mod: ReturnType<typeof getModule>,
    moduleName: string,
    id: string,
    record: unknown,
): Promise<AuditFeedItem[]> {
    if (mod.detailConfig?.loadAudit) return mod.detailConfig.loadAudit(record);
    if (!mod.detailConfig?.auditEnabled) return [];

    const entityName = normalizeAuditEntityName(moduleName);
    const trail = await getEntityAuditTrail(entityName, id);

    return trail.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actionText: actionLabel(entry.action),
        createdAt: entry.createdAt,
        userEmail: entry.user.email,
        tenantName: entry.tenant.legalName,
        summary: buildAuditSummary(entityName, entry.action, entry.before, entry.after),
    }));
}

// U6 (docs/PLAN-fundacao-ux.md, ADR 0014): mesmo par bypass-de-fixture/
// REST-real de `resolveAuditItems` — `load*` é só pra demo/showcase,
// `metadata.<chave>` liga a busca REST pro módulo de domínio real.
export async function resolveNotes(
    mod: ReturnType<typeof getModule>,
    moduleName: string,
    id: string,
    record: unknown,
): Promise<NoteItem[] | undefined> {
    if (mod.detailConfig?.loadNotes) return mod.detailConfig.loadNotes(record);
    if (!mod.detailConfig?.metadata?.notes) return undefined;

    return listNotes(normalizeAuditEntityName(moduleName), id);
}

export async function resolveTags(
    mod: ReturnType<typeof getModule>,
    moduleName: string,
    id: string,
    record: unknown,
): Promise<TagItem[] | undefined> {
    if (mod.detailConfig?.loadTags) return mod.detailConfig.loadTags(record);
    if (!mod.detailConfig?.metadata?.tags) return undefined;

    return listRecordTags(normalizeAuditEntityName(moduleName), id);
}

export async function resolveAttachments(
    mod: ReturnType<typeof getModule>,
    moduleName: string,
    id: string,
    record: unknown,
): Promise<AttachmentItem[] | undefined> {
    if (mod.detailConfig?.loadAttachments) return mod.detailConfig.loadAttachments(record);
    if (!mod.detailConfig?.metadata?.attachments) return undefined;

    return listAttachments(normalizeAuditEntityName(moduleName), id);
}