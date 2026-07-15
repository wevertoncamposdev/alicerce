import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@lib/auth-server";
import { canAccessRoute, resolveRoutePermission } from "@lib/authz";
import { AuthProvider } from "@/contexts/auth-context";
import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { AppSidebar } from "@components/app-sidebar";
import "@lib/registry/bootstrap";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAllowed = canAccessRoute(pathname, currentUser.user.permissions);

  if (!isAllowed) {
    const requiredPermission = resolveRoutePermission(pathname);
    return (
      <main className="flex-1 p-6">
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Acesso negado. Permissão obrigatória: {requiredPermission ?? "desconhecida"}.
        </div>
      </main>
    );
  }

  return (
    <AuthProvider initialUser={currentUser.user} initialTenantId={currentUser.tenantId}>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1">
          {children}
        </main>
      </SidebarProvider>
    </AuthProvider>
  );
}