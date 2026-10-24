import { redirect } from "next/navigation";
import { getCurrentUser } from "@lib/auth-server";
import { apiServer } from "@lib/api-server";
import { AuthProvider } from "@/contexts/auth-context";
import { AppAccessGuard } from "@components/auth/AppAccessGuard";
import { TermsConsentBanner } from "@components/auth/TermsConsentBanner";
import { SidebarProvider } from "@components/ui/sidebar";
import { AppSidebar } from "@core/components/Layout/AppSidebar";
import "@/bootstrap";

// Nome e logo do tenant não vêm no payload do JWT/perfil (só o id) — busca
// separada, com fallback silencioso: um usuário recém-criado sem nenhuma
// role atribuída ainda não tem `tenant.read`, e a sidebar não deve quebrar
// por isso, só deixa de mostrar o nome/logo.
async function loadTenantInfo(
  tenantId: string | null,
): Promise<{ name: string | null; logoUrl: string | null }> {
  if (!tenantId) return { name: null, logoUrl: null };

  try {
    const tenant = await apiServer.get<{ legalName: string; logoUrl?: string | null }>(
      `tenant/${tenantId}`,
    );
    return { name: tenant.legalName, logoUrl: tenant.logoUrl ?? null };
  } catch {
    return { name: null, logoUrl: null };
  }
}

// Mesmo fallback silencioso — avatar é só exibição, nunca deve derrubar a página.
async function loadUserAvatarUrl(): Promise<string | null> {
  try {
    const me = await apiServer.get<{ avatarUrl?: string | null }>("me");
    return me.avatarUrl ?? null;
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const [{ name: tenantName, logoUrl: tenantLogoUrl }, userAvatarUrl] = await Promise.all([
    loadTenantInfo(currentUser.tenantId),
    loadUserAvatarUrl(),
  ]);

  return (
    <AuthProvider initialUser={currentUser.user} initialTenantId={currentUser.tenantId}>
      <AppAccessGuard currentUser={currentUser.user}>
        <SidebarProvider>
          <AppSidebar
            userEmail={currentUser.user.email}
            userName={currentUser.user.name}
            userAvatarUrl={userAvatarUrl}
            tenantName={tenantName}
            tenantLogoUrl={tenantLogoUrl}
          />
          {/* min-w-0: sem isso, um flex item com flex-1 nunca encolhe abaixo do conteúdo
              mais largo (ex.: uma tabela) — a página inteira ganha scroll horizontal em
              telas estreitas em vez do conteúdo largo rolar só dentro do seu próprio
              container (overflow-x-auto). */}
          <main className="min-w-0 flex-1">
            {!currentUser.user.emailVerified ? (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
                Confirme seu e-mail para garantir o acesso à sua conta. Verifique a caixa de entrada de{" "}
                {currentUser.user.email}.
              </div>
            ) : null}
            {!currentUser.user.termsAccepted ? <TermsConsentBanner /> : null}
            {children}
          </main>
        </SidebarProvider>
      </AppAccessGuard>
    </AuthProvider>
  );
}