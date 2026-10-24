"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Input } from "@components/ui/index";
import { SideShell } from "@core/components/Layout/SideShell";
import { alicerceTerms } from "@/alicerce.config";
import Link from "next/link";

// Minúsculas, sem acento, espaço/underscore -> hífen, remove o que não for
// [a-z0-9-] — mesma whitelist que o backend aceita em `tenantSlug`
// (sign-up-public.dto.ts: `^[a-z0-9]+(?:-[a-z0-9]+)*$`).
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos isolados pela normalização NFD
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTenantNameChange(value: string) {
    setTenantName(value);
    if (!slugTouched) {
      setTenantSlug(slugify(value));
    }
  }

  function handleTenantSlugChange(value: string) {
    setSlugTouched(true);
    setTenantSlug(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signUp({
        tenantName,
        tenantSlug,
        email,
        name,
        password,
        acceptedTerms,
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Alicerce</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie sua conta e comece a gerenciar sua {alicerceTerms.tenant.toLowerCase()}
          </p>
        </div>

        <SideShell title="Registro" description="Crie sua conta e a sua instituição em um único fluxo.">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Seu nome
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Seu nome completo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tenantName" className="text-sm font-medium text-foreground">
                Nome da {alicerceTerms.tenant}
              </label>
              <Input
                id="tenantName"
                name="tenantName"
                placeholder="Minha Empresa"
                value={tenantName}
                onChange={(event) => handleTenantNameChange(event.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tenantSlug" className="text-sm font-medium text-foreground">
                Slug da {alicerceTerms.tenant}
              </label>
              <Input
                id="tenantSlug"
                name="tenantSlug"
                placeholder="minha-empresa"
                value={tenantSlug}
                onChange={(event) => handleTenantSlugChange(event.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
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
              <label htmlFor="password" className="text-sm font-medium text-foreground">
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

            <div className="flex items-start gap-2">
              <input
                id="acceptedTerms"
                name="acceptedTerms"
                type="checkbox"
                className="mt-1"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
                disabled={submitting}
              />
              <label htmlFor="acceptedTerms" className="text-sm text-muted-foreground">
                Li e aceito os{" "}
                <Link href="/termos" target="_blank" className="font-medium text-foreground hover:underline">
                  Termos de Uso
                </Link>
                .
              </label>
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Ja tem conta?{" "}
              <Link href="/auth/login" className="font-medium text-foreground hover:underline">
                Faca login
              </Link>
            </p>
          </div>
        </SideShell>
      </div>
    </div>
  );
}
