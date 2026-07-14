import { getCurrentUser } from "@/lib/auth-server";
import { apiServer, ApiServerError } from "@/lib/api-server";
import { AuditEntry } from "@/features/audit/audit.types";
import AuditTable from "@/features/audit/components/AuditTable";
import AuditRefreshButton from "@/features/audit/components/AuditRefreshButton";
import { DetailShell, PainelSearchShell } from "@/components/Shells";

// Server Component: os dados são buscados aqui, no servidor, direto via
// `apiServer` (que lê o cookie httpOnly com `lib/session.ts`). Não há mais
// `useEffect`/`useState` de loading para a carga inicial — quando a página
// chega no navegador, os dados já estão no HTML.
export default async function AuditPage() {
  const currentUser = await getCurrentUser();
  const tenantId = currentUser?.tenantId;

  let entries: AuditEntry[] = [];
  let error: string | null = null;

  if (tenantId) {
    try {
      entries = await apiServer.get<AuditEntry[]>(`tenant/${tenantId}/audit`);
    } catch (err) {
      error =
        err instanceof ApiServerError
          ? err.message
          : "Falha ao carregar registros de auditoria.";
    }
  }

  return (
    <DetailShell
      title="Auditoria"
      description="Consulta de logs com composicao arquitetural da Fase 2."
      error={error}
    >
      {!tenantId ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Selecione um tenant no modulo de tenants para consultar a auditoria.
        </div>
      ) : null}

      <PainelSearchShell title="Registros" actions={<AuditRefreshButton />}>
        <AuditTable entries={entries} />
      </PainelSearchShell>
    </DetailShell>
  );
}
