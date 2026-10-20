import { SideShell } from "@core/components/Layout/SideShell";
import { ForgotPasswordForm } from "@components/auth/ForgotPasswordForm";
import { alicerceTerms } from "@/alicerce.config";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Alicerce</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recupere o acesso à sua {alicerceTerms.tenant.toLowerCase()}
          </p>
        </div>

        <SideShell
          title="Esqueci minha senha"
          description="Informe seu e-mail para receber um link de redefinição."
        >
          <ForgotPasswordForm />
        </SideShell>
      </div>
    </div>
  );
}
