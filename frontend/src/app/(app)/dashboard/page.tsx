"use client";

import { useAuth } from "@/contexts/auth-context";
import { useAudit } from "@/features/audit/hooks/useAudit";
import { usePermissions } from "@/features/permissions/hooks/usePermissions";
import { useRoles } from "@/features/roles/hooks/useRoles";
import { useUsers } from "@/features/users/hooks/useUsers";
import { DetailShell, PainelSearchShell } from "@/components/shells";
import { Button } from "@components/ui/index";
import App from "next/app";
import { AppTopbar } from "@/components/layout/AppTopbar";

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

    <>
      <AppTopbar title="Dashboard" />
      <div className="mt-4 p-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Usuarios" value={users.length} loading={usersLoading} />
        <StatCard title="Papeis" value={roles.length} loading={rolesLoading} />
        <StatCard title="Permissoes" value={permissions.length} loading={permissionsLoading} />
        <StatCard title="Auditorias" value={entries.length} loading={auditsLoading} />
      </div>
    </>

  );
}
