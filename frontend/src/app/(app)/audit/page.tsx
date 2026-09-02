import { getCurrentUser } from "@lib/auth-server";
import { apiServer, ApiServerError } from "@lib/api-server";
import { DetailShell, PainelSearchShell } from "@/components/shells";
import { AuditListView } from "@/modules/audit/components/AuditListView";
import type { AuditEntry } from "@/modules/audit/types/types";

// Server Component: os dados são buscados aqui, no servidor, direto via
// `apiServer` (que lê o cookie httpOnly com `lib/session.ts`).
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

      <PainelSearchShell title="Registros">
        <AuditListView data={entries} />
      </PainelSearchShell>
    </DetailShell>
  );
}
