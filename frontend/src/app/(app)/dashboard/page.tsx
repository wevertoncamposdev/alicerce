import { AppTopbar } from "@/components/Layout/AppTopbar";
import { apiServer, ApiServerError } from "@/lib/api-server";
import { getCurrentUser, hasRole } from "@/lib/auth-server";
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
  const isAdmin = !!currentUser && hasRole(currentUser, "ADMIN");

  let error: string | null = null;
  let users = 0;
  let roles = 0;
  let permissions = 0;
  let entries = 0;

  try {
    const [usersResult, rolesResult, permissionsResult, auditResult] = await Promise.allSettled([
      searchUsers({ pagination: { pageIndex: 0, pageSize: 1 } }),
      isAdmin ? searchRoles({ pagination: { pageIndex: 0, pageSize: 1 } }) : Promise.resolve({ pagination: { total: 0 } }),
      isAdmin ? searchPermissions({ pagination: { pageIndex: 0, pageSize: 1 } }) : Promise.resolve({ pagination: { total: 0 } }),
      tenantId ? apiServer.get<DashboardAuditEntry[]>(`tenant/${tenantId}/audit`) : Promise.resolve([]),
    ]);

    if (usersResult.status === "fulfilled") {
      users = usersResult.value.pagination.total;
    } else if (usersResult.reason instanceof ApiServerError && usersResult.reason.status !== 403) {
      throw usersResult.reason;
    }

    if (rolesResult.status === "fulfilled") {
      roles = rolesResult.value.pagination.total;
    } else if (rolesResult.reason instanceof ApiServerError && rolesResult.reason.status !== 403) {
      throw rolesResult.reason;
    }

    if (permissionsResult.status === "fulfilled") {
      permissions = permissionsResult.value.pagination.total;
    } else if (permissionsResult.reason instanceof ApiServerError && permissionsResult.reason.status !== 403) {
      throw permissionsResult.reason;
    }

    if (auditResult.status === "fulfilled") {
      entries = auditResult.value.length;
    } else if (auditResult.reason instanceof ApiServerError && auditResult.reason.status !== 403) {
      throw auditResult.reason;
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
