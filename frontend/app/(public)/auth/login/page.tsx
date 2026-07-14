import { SideShell } from "@/components/Shells";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">SaaS Admin</h1>
          <p className="mt-2 text-sm text-zinc-600">Acesse sua conta para gerenciar tenants</p>
        </div>

        <SideShell title="Login" description="Entre com suas credenciais de acesso.">
          <LoginForm />
        </SideShell>
      </div>
    </div>
  );
}