// app/(app)/develop/demo/pessoas/layout.tsx
//
// `registerModule` joga se chamado duas vezes com o mesmo `model` —
// mesmo motivo de `develop/detail-showcase/layout.tsx`: import
// centralizado aqui, compartilhado por `page.tsx` e `[id]/page.tsx`.
import "@modules/develop/demo/pessoas/config/contract";

export default function DemoPessoasLayout({ children }: { children: React.ReactNode }) {
    return children;
}
