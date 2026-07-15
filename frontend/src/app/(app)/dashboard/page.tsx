"use client";

import { useAuth } from "@/contexts/auth-context";
import { useAudit } from "@/features/audit/hooks/useAudit";
import { usePermissions } from "@/features/permissions/hooks/usePermissions";
import { useRoles } from "@/features/roles/hooks/useRoles";
import { useUsers } from "@/features/users/hooks/useUsers";
import { DetailShell, PainelSearchShell } from "@components/Shells";
import { Button } from "@components/ui/index";

function StatCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-zinc-900">
        {loading ? "Carregando..." : value}
      </p>
    </div>
  );
}

export default function MainPage() {
  const { currentTenantId } = useAuth();
  const { users, loading: usersLoading, error: usersError } = useUsers(currentTenantId);
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();
  const {
    permissions,
    loading: permissionsLoading,
    error: permissionsError,
  } = usePermissions();
  const {
    entries,
    loading: auditsLoading,
    error: auditsError,
  } = useAudit({
    tenantId: currentTenantId,
  });

  const errorMessage = usersError || rolesError || permissionsError || auditsError;
  const isLoading = usersLoading || rolesLoading || permissionsLoading || auditsLoading;
  const hasData = users.length > 0 || roles.length > 0 || permissions.length > 0 || entries.length > 0;

  return (
    <DetailShell
      title="Dashboard"
      description="Resumo dos principais modulos e indicadores do tenant atual."
      error={errorMessage}
    >
      {!currentTenantId ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Selecione um tenant no modulo de tenants para visualizar os indicadores do dashboard.
        </div>
      ) : null}

      <PainelSearchShell
        title="Indicadores do Tenant"
        actions={
          <Button
            variant="outline"
            disabled={isLoading}
            onClick={() => {
              // Trigger reload for all modules
              window.location.reload();
            }}
          >
            {isLoading ? "Carregando..." : "Atualizar"}
          </Button>
        }
      >
        {!hasData && !isLoading ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
            Nenhum dado disponivel. Crie usuarios, papeis e permissoes para visualizar indicadores.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Usuarios" value={users.length} loading={usersLoading} />
            <StatCard title="Papeis" value={roles.length} loading={rolesLoading} />
            <StatCard title="Permissoes" value={permissions.length} loading={permissionsLoading} />
            <StatCard title="Auditorias" value={entries.length} loading={auditsLoading} />
          </div>
        )}
      </PainelSearchShell>
    </DetailShell>
  );
}
