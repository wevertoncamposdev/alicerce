import { SideShell } from "@core/components/Layout/SideShell";
import { PlatformLoginForm } from "@components/platform/PlatformLoginForm";

export default function PlatformLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Alicerce — Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesso restrito à equipe da plataforma
          </p>
        </div>

        <SideShell title="Login de plataforma" description="Entre com suas credenciais de usuário de plataforma.">
          <PlatformLoginForm />
        </SideShell>
      </div>
    </div>
  );
}
