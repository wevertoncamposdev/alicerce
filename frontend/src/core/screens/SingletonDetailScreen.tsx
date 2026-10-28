// screens/SingletonDetailScreen.tsx
//
// Variante de DetailViewScreen para registro único, sem lista (ex.: /perfil,
// /configuracoes/instituicao) — ver ADR 0009. Mesma leitura via
// getModule+DataProvider, mas sem id de URL (recordId fixo) e sem
// breadcrumb de volta pra lista: não existe lista para esses módulos.
import { getModule } from "@core/registry";
import { createDataProvider } from "@core/data-provider";
import { ApiServerError } from "@lib/api-server";
import { DetailView } from "@core/components/DetailView/DetailView";
import { AppTopbar } from "@core/components/Layout/AppTopbar";
import { PermissionDeniedView } from "@core/components/Layout/PermissionDeniedView";
import { AutoSaveStatusProvider } from "@/contexts/autosave-status-context";
import { AutoSaveIndicator } from "@core/components/Layout/AutoSaveIndicator";
import type { DetailContext } from "@core/registry/types";
import { resolveContextItems, resolveAuditItems } from "./DetailViewScreen";

export async function SingletonDetailScreen({
    moduleName,
    recordId,
}: {
    moduleName: string;
    recordId: string;
}) {
    const mod = getModule(moduleName);
    const dataProvider = createDataProvider();

    let record: Record<string, unknown>;
    try {
        record = await dataProvider.read(moduleName, recordId);
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
        resolveAuditItems(mod, moduleName, recordId, record),
    ]);

    const context: DetailContext<Record<string, unknown>> = { record, contextItems, auditItems };
    const headerTitle = mod.detailLayout?.header?.(context).title ?? mod.label;
    // Um item só, sem href — Breadcrumbs.tsx já renderiza o último item
    // sempre como texto puro, nunca como link.
    const breadcrumb = [{ label: headerTitle }];

    return (
        <AutoSaveStatusProvider>
            <AppTopbar
                title={mod.label}
                breadcrumb={breadcrumb}
                autosave={<AutoSaveIndicator />}
                actions={mod.detailLayout?.toolbar?.(context)}
            />
            <div className="mx-auto w-full max-w-[1400px] space-y-4 px-6 py-4">
                <DetailView
                    moduleDefinition={mod}
                    record={record}
                    recordId={recordId}
                    contextItems={contextItems}
                    auditItems={auditItems}
                />
            </div>
        </AutoSaveStatusProvider>
    );
}
