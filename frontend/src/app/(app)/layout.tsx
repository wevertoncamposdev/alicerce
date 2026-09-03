import { redirect } from "next/navigation";
import { getCurrentUser } from "@lib/auth-server";
import { AuthProvider } from "@/contexts/auth-context";
import { AppAccessGuard } from "@/components/auth/AppAccessGuard";
import { SidebarProvider } from "@components/ui/sidebar";
import { AppSidebar } from "@/components/Layout/AppSidebar";
import "@lib/registry/bootstrap";
import ToastProvider from "@components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  return (
    <AuthProvider initialUser={currentUser.user} initialTenantId={currentUser.tenantId}>
      <AppAccessGuard currentUser={currentUser.user}>
        <SidebarProvider>
          <ToastProvider>
            <AppSidebar />
            <main className="flex-1">{children}</main>
          </ToastProvider>
        </SidebarProvider>
      </AppAccessGuard>
    </AuthProvider>
  );
}