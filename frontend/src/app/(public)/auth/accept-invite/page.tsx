import { SideShell } from "@core/components/Layout/SideShell";
import { AcceptInviteForm } from "@components/auth/AcceptInviteForm";
import { alicerceTerms } from "@/alicerce.config";

export default async function AcceptInvitePage({
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
            Você foi convidado para fazer parte de uma {alicerceTerms.tenant.toLowerCase()}
          </p>
        </div>

        <SideShell title="Aceitar convite" description="Defina sua senha para acessar sua conta.">
          {token ? (
            <AcceptInviteForm token={token} />
          ) : (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              Link de convite inválido ou incompleto.
            </div>
          )}
        </SideShell>
      </div>
    </div>
  );
}
