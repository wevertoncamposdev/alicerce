import { SideShell } from "@core/components/Layout/SideShell";
import { ResetPasswordForm } from "@components/auth/ResetPasswordForm";
import { alicerceTerms } from "@/alicerce.config";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Alicerce</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Defina uma nova senha para acessar sua {alicerceTerms.tenant.toLowerCase()}
          </p>
        </div>

        <SideShell title="Redefinir senha" description="Escolha uma nova senha para sua conta.">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              Link inválido ou incompleto. Solicite um novo link de redefinição.
            </div>
          )}
        </SideShell>
      </div>
    </div>
  );
}
