// screens/DetailViewScreen.tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { getEntityAuditTrail } from "@lib/data-provider/rest/audit";
import { DetailView } from "@/components/DetailView/DetailView";
import { AppTopbar } from "@/components/Layout/AppTopbar";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@/components/Layout/AutoSaveIndicator";
import type { AuditFeedItem, ContextItem } from "@/components/DetailView/MetaDataView/types";

export async function DetailViewScreen({ moduleName, id }: { moduleName: string; id: string }) {
    const mod = getModule(moduleName);
    const dataProvider = createDataProvider();

    const record = await dataProvider.read(moduleName, id);

    const [contextItems, auditItems] = await Promise.all([
        resolveContextItems(mod, record),
        resolveAuditItems(mod, moduleName, id),
    ]);

    return (
        <AutoSaveStatusProvider>
            <AppTopbar title={mod.label} autosave={<AutoSaveIndicator />} />
            <div className="px-4 py-2">
                <DetailView
                    moduleDefinition={mod}
                    record={record}
                    contextItems={contextItems}
                    auditItems={auditItems}
                    title={mod.label}
                />
            </div>
        </AutoSaveStatusProvider>
    );
}

async function resolveContextItems(mod: ReturnType<typeof getModule>, record: unknown): Promise<ContextItem[]> {
    if (!mod.detailConfig?.loadContext) return [];
    return mod.detailConfig.loadContext(record);
}

async function resolveAuditItems(
    mod: ReturnType<typeof getModule>,
    moduleName: string,
    id: string,
): Promise<AuditFeedItem[]> {
    if (!mod.detailConfig?.auditEnabled) return [];

    const trail = await getEntityAuditTrail(moduleName, id);

    return trail.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        userEmail: entry.user.email,
        tenantName: entry.tenant.legalName,
        summary: entry.after ? `Antes: ${entry.before ?? "—"} | Depois: ${entry.after}` : "—",
    }));
}