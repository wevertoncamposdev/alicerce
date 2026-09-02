import { AppTopbar } from "@/components/Layout/AppTopbar";
import { apiServer, ApiServerError } from "@/lib/api-server";
import { getCurrentUser } from "@/lib/auth-server";
import { searchPermissions } from "@/modules/permissions/config/provider";
import { searchRoles } from "@/modules/roles/config/provider";
import { searchUsers } from "@/modules/users/config/provider";

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

type DashboardAuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  user?: { email?: string };
};

export default async function MainPage() {
  const currentUser = await getCurrentUser();
  const tenantId = currentUser?.tenantId;

  let error: string | null = null;
  let users = 0;
  let roles = 0;
  let permissions = 0;
  let entries = 0;

  try {
    const [usersResult, rolesResult, permissionsResult] = await Promise.all([
      searchUsers({ pagination: { pageIndex: 0, pageSize: 1 } }),
      searchRoles({ pagination: { pageIndex: 0, pageSize: 1 } }),
      searchPermissions({ pagination: { pageIndex: 0, pageSize: 1 } }),
    ]);

    users = usersResult.pagination.total;
    roles = rolesResult.pagination.total;
    permissions = permissionsResult.pagination.total;

    if (tenantId) {
      const auditResult = await apiServer.get<DashboardAuditEntry[]>(`tenant/${tenantId}/audit`);
      entries = auditResult.length;
    }
  } catch (err) {
    error = err instanceof ApiServerError ? err.message : err instanceof Error ? err.message : "Falha ao carregar dashboard.";
  }

  return (
    <>
      <AppTopbar title="Dashboard" />
      {error ? (
        <div className="mt-4 mx-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="mt-4 p-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Usuarios" value={users} />
        <StatCard title="Papeis" value={roles} />
        <StatCard title="Permissoes" value={permissions} />
        <StatCard title="Auditorias" value={entries} />
      </div>
    </>
  );
}
