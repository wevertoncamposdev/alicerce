import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@components/ui/empty-state";
import { Button } from "@components/ui/button";

// Etapa 10.4 — cobre qualquer `notFound()` chamado dentro do grupo (app),
// incluindo as rotas de detalhe (ver DetailViewScreen.tsx: id inexistente
// → notFound()). Next escolhe o not-found.tsx mais próximo na árvore de
// rotas, então um só aqui já serve users/[id], roles/[id] etc.
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <EmptyState
        icon={FileQuestion}
        title="Página ou registro não encontrado"
        description="O que você procura não existe ou foi removido."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Voltar ao início</Link>
          </Button>
        }
      />
    </div>
  );
}
