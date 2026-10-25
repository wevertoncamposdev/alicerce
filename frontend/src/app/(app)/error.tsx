"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@components/ui/empty-state";
import { Button } from "@components/ui/button";

// Etapa 10.4 — error boundary do grupo (app). `error.tsx` exige "use
// client" (Next) e cobre qualquer erro não tratado de uma página/layout
// abaixo deste, incluindo as rotas de detalhe.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erro não tratado", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <EmptyState
        icon={AlertTriangle}
        title="Algo deu errado"
        description="Tente de novo — se o problema continuar, avise o suporte."
        action={<Button onClick={() => reset()}>Tentar de novo</Button>}
      />
    </div>
  );
}
