import { SideShell } from "@core/components/Layout/SideShell";
import { LoginForm } from "@components/auth/LoginForm";
import { alicerceTerms } from "@/alicerce.config";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Alicerce</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse sua conta para gerenciar sua {alicerceTerms.tenant.toLowerCase()}
          </p>
        </div>

        <SideShell title="Login" description="Entre com suas credenciais de acesso.">
          <LoginForm />
        </SideShell>
      </div>
    </div>
  );
}