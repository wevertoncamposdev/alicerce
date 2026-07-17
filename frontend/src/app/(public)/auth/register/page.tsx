"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Input } from "@components/ui/index";
import { SideShell } from "@/components/engine";
import Link from "next/link";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signUp({
        tenantName,
        tenantSlug,
        email,
        password,
      });
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no auto-onboarding.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">SaaS Admin</h1>
          <p className="mt-2 text-sm text-zinc-600">Crie sua conta e comece a gerenciar tenants</p>
        </div>

        <SideShell title="Registro" description="Crie sua conta e o tenant inicial em um unico fluxo.">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tenantName" className="text-sm font-medium text-zinc-700">
                Nome do Tenant
              </label>
              <Input
                id="tenantName"
                name="tenantName"
                placeholder="Minha Empresa"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tenantSlug" className="text-sm font-medium text-zinc-700">
                Slug do Tenant
              </label>
              <Input
                id="tenantSlug"
                name="tenantSlug"
                placeholder="minha-empresa"
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                E-mail
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                Senha
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {error ? (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <div className="mt-6 border-t pt-4">
            <p className="text-center text-sm text-zinc-600">
              Ja tem conta?{" "}
              <Link href="/auth/login" className="font-medium text-zinc-900 hover:underline">
                Faca login
              </Link>
            </p>
          </div>
        </SideShell>
      </div>
    </div>
  );
}
