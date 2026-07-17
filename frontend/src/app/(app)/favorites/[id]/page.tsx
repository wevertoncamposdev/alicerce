import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { getEntityAuditTrail } from "@lib/data-provider/rest/audit";

import { FormView } from "@components/type-view/form-view/FormView";
import { MetaDataShell } from "@components/shells/MetaDataShell";

import type { AuditFeedItem, ContextItem } from "@components/shells/MetaDataShell/types";
import type { FavoriteEntity } from "@modules/favorites/types";
import { MetaDataSidebar } from "@/components/shells/MetaDataShell/MetaDataSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@/components/layout/AutoSaveIndicator";

import { listFavoriteNotes } from "@modules/favorites/config/notes-provider";
import { RelationTablePanel } from "@components/shells/RelationShell/RelationTablePanel";
interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FavoriteDetailPage({ params }: PageProps) {
    const { id } = await params;

    const favoritesModule = getModule<FavoriteEntity>("favorites");
    const dataProvider = createDataProvider();
    const favorite = await dataProvider.read<FavoriteEntity>("favorites", id);
    const auditTrail = await getEntityAuditTrail("favorites", id);
    const notes = await listFavoriteNotes(favorite.id);

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
            <div className="">
                <AppTopbar
                    title={favoritesModule.label}
                    autosave={<AutoSaveIndicator />}
                />
                <div className="px-4 py-2">
                    <FormView<FavoriteEntity>
                        mode="edit"
                        model="favorites"
                        recordId={favorite.id}
                        fields={favoritesModule.formFields}
                        initialValues={favorite}
                    />
                    <div className="mt-6">
                        <h2 className="text-sm font-medium text-muted-foreground mb-2">Notas</h2>
                        <RelationTablePanel favoriteId={favorite.id} initialNotes={notes} />
                    </div>
                    <MetaDataSidebar>
                        <MetaDataShell contextItems={contextItems} auditItems={auditItems} />
                    </MetaDataSidebar>
                </div>
            </div>
        </AutoSaveStatusProvider>
    );
}