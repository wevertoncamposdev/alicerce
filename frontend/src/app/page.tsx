import Link from "next/link";
import Image from "next/image";
import { Button } from "@components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="flex w-full justify-end gap-3 border-b border-border px-8 py-4">
        <Button asChild variant="outline">
          <Link href="/auth/login">Login</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/register">Registrar</Link>
        </Button>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <Image src="/icon.png" alt="Alicerce" width={96} height={96} className="mb-8" priority />
        <h1 className="mb-4 text-center text-4xl font-bold text-foreground">
          Alicerce
        </h1>
        <p className="mb-8 max-w-xl text-center text-lg text-muted-foreground">
          Base reutilizável para produtos SaaS multi-tenant com autenticação, RBAC
          granular e auditoria. Estrutura modular para facilitar a expansão e a
          manutenção.
        </p>
        <span className="text-sm text-muted-foreground">
          Comece acessando o Login ou criando sua conta no Registro.
        </span>
      </main>
    </div>
  );
}
