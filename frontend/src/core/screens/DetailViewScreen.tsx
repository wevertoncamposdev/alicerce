// screens/DetailViewScreen.tsx
import { PanelRight } from "lucide-react";
import { getModule } from "@core/registry";
import { createDataProvider } from "@core/data-provider";
import { getEntityAuditTrail } from "@core/data-provider/rest/audit";
import { ApiServerError } from "@lib/api-server";
import { getCurrentUser } from "@lib/auth-server";
import { resolveActionPermission, type AuthAction } from "@lib/authz";
import { alicerceModules } from "@/alicerce.config";
import { Button } from "@components/ui/button";
import { DetailView } from "@core/components/DetailView/DetailView";
import { AppTopbar } from "@core/components/Layout/AppTopbar";
import { PermissionDeniedView } from "@core/components/Layout/PermissionDeniedView";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@core/components/Layout/AutoSaveIndicator";
import { MetaDataSidebar } from "@core/components/DetailView/MetaDataView/MetaDataSidebar";
import { MetaDataView } from "@core/components/DetailView/MetaDataView";
import type { AuditFeedItem, ContextItem } from "@core/components/DetailView/MetaDataView/types";

export async function DetailViewScreen({
    moduleName,
    id,
    searchParams,
}: {
    moduleName: string;
    id: string;
    /** Só módulos migrados pra `header`/`sections` consomem `?mode=edit` — os demais ignoram. */
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const mod = getModule(moduleName);
    const dataProvider = createDataProvider();
    const isEditing = (await searchParams)?.mode === "edit";

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

    const [contextItems, auditItems, canEdit] = await Promise.all([
        resolveContextItems(mod, record),
        resolveAuditItems(mod, moduleName, id, record),
        resolveCanEdit(moduleName),
    ]);

    const hasHeader = Boolean(mod.detailLayout?.header);
    const metaDataContent = <MetaDataView contextItems={contextItems} auditItems={auditItems} />;

    return (
        <AutoSaveStatusProvider>
            <AppTopbar
                title={mod.label}
                autosave={<AutoSaveIndicator />}
                actions={
                    hasHeader ? undefined : <MetaDataSidebar>{metaDataContent}</MetaDataSidebar>
                }
            />
            <div className="mx-auto w-full max-w-[1400px] space-y-4 px-6 py-4">
                <DetailView
                    moduleDefinition={mod}
                    record={record}
                    recordId={id}
                    contextItems={contextItems}
                    auditItems={auditItems}
                    canEdit={canEdit}
                    isEditing={isEditing}
                    metadataSidebar={
                        hasHeader ? (
                            <MetaDataSidebar
                                trigger={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Abrir metadados"
                                    >
                                        <PanelRight className="size-4" />
                                    </Button>
                                }
                            >
                                {metaDataContent}
                            </MetaDataSidebar>
                        ) : undefined
                    }
                />
            </div>
        </AutoSaveStatusProvider>
    );
}

async function resolveCanEdit(moduleName: string): Promise<boolean> {
    // Módulos fora do manifesto real (ex.: fixture de `/develop/detail-showcase`) não têm
    // permissão pra checar — ficam sempre editáveis, servem só pra revisão visual do layout.
    const isRealModule = alicerceModules.some((entry) => entry.key === moduleName);
    if (!isRealModule) return true;

    const permission = resolveActionPermission(`${moduleName}.update` as AuthAction);
    if (!permission) return false;

    const currentUser = await getCurrentUser();
    return currentUser?.user.permissions.includes(permission) ?? false;
}

async function resolveContextItems(mod: ReturnType<typeof getModule>, record: unknown): Promise<ContextItem[]> {
    if (!mod.detailConfig?.loadContext) return [];
    return mod.detailConfig.loadContext(record);
}

function normalizeAuditEntityName(moduleName: string) {
    const trimmed = moduleName.trim();
    if (!trimmed) return trimmed;
    return trimmed.endsWith("s") ? trimmed.slice(0, -1) : trimmed;
}

async function resolveAuditItems(
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