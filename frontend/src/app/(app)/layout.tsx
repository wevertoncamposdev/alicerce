import { redirect } from "next/navigation";
import { getCurrentUser } from "@lib/auth-server";
import { apiServer } from "@lib/api-server";
import { AuthProvider } from "@/contexts/auth-context";
import { AppAccessGuard } from "@components/auth/AppAccessGuard";
import { SidebarProvider } from "@components/ui/sidebar";
import { AppSidebar } from "@components/Layout/AppSidebar";
import "@lib/registry/bootstrap";

// Nome do tenant não vem no payload do JWT/perfil (só o id) — busca
// separada, com fallback silencioso: um usuário recém-criado sem nenhuma
// role atribuída ainda não tem `tenant.read`, e a sidebar não deve quebrar
// por isso, só deixa de mostrar o nome.
async function loadTenantName(tenantId: string | null): Promise<string | null> {
  if (!tenantId) return null;

  try {
    const tenant = await apiServer.get<{ legalName: string }>(`tenant/${tenantId}`);
    return tenant.legalName;
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const tenantName = await loadTenantName(currentUser.tenantId);

  return (
    <AuthProvider initialUser={currentUser.user} initialTenantId={currentUser.tenantId}>
      <AppAccessGuard currentUser={currentUser.user}>
        <SidebarProvider>
          <AppSidebar userEmail={currentUser.user.email} tenantName={tenantName} />
          <main className="flex-1">{children}</main>
        </SidebarProvider>
      </AppAccessGuard>
    </AuthProvider>
  );
}