import { Loader2 } from "lucide-react";

// Etapa 10.4 — fallback genérico do grupo (app) (primeiro carregamento).
// Navegação entre lista e detalhe dentro do grupo usa o `loading.tsx`
// específico de cada rota de detalhe (não herda deste — ver DetailLoadingSkeleton).
export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
