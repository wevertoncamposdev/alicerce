"use client"

import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/contexts/auth-context";
import { canAccessRoute, resolveRoutePermission } from "@/lib/authz";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const permissions = user?.permissions ?? [];
  const isAllowed = canAccessRoute(pathname, permissions);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return <main className="flex-1 p-4">Verificando sessao...</main>;
  }

  if (!isAllowed) {
    const requiredPermission = resolveRoutePermission(pathname);

    return (
      <main className="flex-1 p-6">
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Acesso negado. Permissao obrigatoria: {requiredPermission ?? "desconhecida"}.
        </div>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 p-4">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
