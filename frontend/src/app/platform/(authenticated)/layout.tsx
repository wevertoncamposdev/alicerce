import Link from "next/link";
import { redirect } from "next/navigation";
import { platformApiServer, PlatformApiServerError } from "@lib/platform-api-server";
import { platformLogout } from "@lib/platform-login";
import { Button } from "@components/ui/index";

interface PlatformUserContext {
  id: string;
  email: string;
  name: string;
}

async function getPlatformUser(): Promise<PlatformUserContext | null> {
  try {
    return await platformApiServer.get<PlatformUserContext>("platform-auth/me");
  } catch (error) {
    if (error instanceof PlatformApiServerError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

// Sem alicerceModules/authz.ts (ver ADR 0012, decisão 5): acesso aqui é
// binário, então a nav é só uma lista fixa, não um registry resolvido por
// permissão.
const PLATFORM_NAV = [
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/feedbacks", label: "Feedbacks" },
];

// Route group "(authenticated)": não existe na URL, só mantém `/platform/login`
// fora desta árvore. Sem isso, este layout envolvia a própria página de login
// e o redirect abaixo mandava /platform/login para /platform/login — loop
// infinito pra quem nunca logou (bug encontrado ao verificar a pendência
// "redirect cosmético" do PLAN.md: não era cosmético).
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const platformUser = await getPlatformUser();

  if (!platformUser) {
    redirect("/platform/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-foreground">Alicerce — Management</span>
          <nav className="flex gap-4">
            {PLATFORM_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{platformUser.email}</span>
          <form action={platformLogout}>
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
