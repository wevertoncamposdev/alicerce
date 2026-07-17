import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { getEntityAuditTrail } from "@lib/data-provider/rest/audit";
import { DetailShellEngine } from "@/components/engine/DetailShellEngine";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@/components/layout/AutoSaveIndicator";
import type { ContextItem, AuditFeedItem } from "@/components/engine/MetaDataShell/types";
import type { FavoriteEntity } from "@modules/favorites/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FavoriteDetailPage({ params }: PageProps) {
    const { id } = await params;
    const favoritesModule = getModule<FavoriteEntity>("favorites");
    const dataProvider = createDataProvider();

    const favorite = await dataProvider.read<FavoriteEntity>("favorites", id);
    const auditTrail = await getEntityAuditTrail("favorites", id);

    const contextItems: ContextItem[] = [
        { key: "createdAt", label: "Criado em", value: favorite.createdAt.slice(0, 16).replace("T", ", ") },
        { key: "userId", label: "Usuário", value: favorite.user.email ?? "—" },
        { key: "tenantId", label: "Tenant", value: favorite.tenant.legalName ?? "—" },
    ];

    const auditItems: AuditFeedItem[] = auditTrail.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        userEmail: entry.user.email,
        tenantName: entry.tenant.legalName,
        summary: entry.after ? `Antes: ${entry.before ?? "—"} | Depois: ${entry.after}` : "—",
    }));

    return (
        <AutoSaveStatusProvider>
            <AppTopbar title={favoritesModule.label} autosave={<AutoSaveIndicator />} />
            <div className="px-4 py-2">
                <DetailShellEngine<FavoriteEntity>
                    moduleDefinition={favoritesModule}
                    record={favorite}
                    contextItems={contextItems}
                    auditItems={auditItems}
                    title={favoritesModule.label}
                />
            </div>
        </AutoSaveStatusProvider>
    );
}