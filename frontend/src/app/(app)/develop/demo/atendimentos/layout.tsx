// app/(app)/develop/demo/atendimentos/layout.tsx
//
// `registerModule` joga se chamado duas vezes com o mesmo `model` —
// mesmo motivo de `develop/demo/pessoas/layout.tsx`: import
// centralizado aqui, compartilhado por `page.tsx` e `[id]/page.tsx`.
import "@modules/develop/demo/atendimentos/config/contract";

export default function DemoAtendimentosLayout({ children }: { children: React.ReactNode }) {
    return children;
}
