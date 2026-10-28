import Link from "next/link";
import { SideShell } from "@core/components/Layout/SideShell";
import { alicerceTerms } from "@/alicerce.config";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

async function confirmEmailChange(token: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/auth/confirm-email-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const payload = await res.json();
    if (!res.ok) {
      return { ok: false, message: payload?.message ?? "Falha ao confirmar o novo e-mail." };
    }

    return { ok: true, message: payload?.message ?? "E-mail alterado com sucesso." };
  } catch {
    return { ok: false, message: "Falha ao confirmar o novo e-mail." };
  }
}

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const result = token
    ? await confirmEmailChange(token)
    : { ok: false, message: "Link de confirmação inválido ou incompleto." };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Alicerce</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirmação de troca de e-mail da sua {alicerceTerms.tenant.toLowerCase()}
          </p>
        </div>

        <SideShell title="Confirmar novo e-mail">
          <div
            className={
              result.ok
                ? "rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
                : "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {result.message}
          </div>

          <div className="mt-6 border-t pt-4">
            <p className="text-center text-sm text-zinc-600">
              <Link href="/auth/login" className="font-medium text-zinc-900 hover:underline">
                Ir para o login
              </Link>
            </p>
          </div>
        </SideShell>
      </div>
    </div>
  );
}
