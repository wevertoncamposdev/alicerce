// screens/DetailViewScreen.tsx
import { getModule } from "@core/registry";
import { createDataProvider } from "@core/data-provider";
import { getEntityAuditTrail } from "@core/data-provider/rest/audit";
import { ApiServerError } from "@lib/api-server";
import { DetailView } from "@core/components/DetailView/DetailView";
import { AppTopbar } from "@core/components/Layout/AppTopbar";
import { PermissionDeniedView } from "@core/components/Layout/PermissionDeniedView";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@core/components/Layout/AutoSaveIndicator";
import { MetaDataSidebar } from "@core/components/DetailView/MetaDataView/MetaDataSidebar";
import { MetaDataView } from "@core/components/DetailView/MetaDataView";
import type { AuditFeedItem, ContextItem } from "@core/components/DetailView/MetaDataView/types";
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
        throw err;
    }

    const [contextItems, auditItems] = await Promise.all([
        resolveContextItems(mod, record),
        resolveAuditItems(mod, moduleName, id, record),
    ]);

    const metaDataContent = <MetaDataView contextItems={contextItems} auditItems={auditItems} />;
    const context: DetailContext<Record<string, unknown>> = { record, contextItems, auditItems };
    const headerTitle =
        mod.detailLayout?.header?.(context).title ??
        (record.title as string | undefined) ??
        (record.name as string | undefined) ??
        mod.label;
    const breadcrumb = [
        { label: mod.label, href: `/${moduleName}` },
        { label: headerTitle },
    ];

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
        createdAt: entry.createdAt,
        userEmail: entry.user.email,
        tenantName: entry.tenant.legalName,
        summary: entry.after ? `Antes: ${entry.before ?? "—"} | Depois: ${entry.after}` : "—",
    }));
}