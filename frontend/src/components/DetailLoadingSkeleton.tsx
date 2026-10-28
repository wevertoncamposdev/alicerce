// Etapa 10.4 — `loading.tsx` não herda do grupo pai (cada segmento tem seu
// próprio boundary), então toda rota de detalhe (`[id]/loading.tsx`)
// importa este componente em vez de repetir o esqueleto.
export function DetailLoadingSkeleton() {
    return (
        <div className="space-y-4 p-6">
            <div className="h-8 w-1/3 animate-pulse rounded-md bg-muted" />
            <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
        </div>
    );
}
