// app/(app)/develop/layout.tsx
//
// `/develop` é documentação interna/showcase do template (ADR 0005) — nunca
// deveria estar acessível num deploy de produção (F4.2, docs/Plan-Finalizacao.md).
// `notFound()` aqui cobre toda a subárvore (page.tsx e detail-showcase/**).
import { notFound } from "next/navigation";

export default function DevelopLayout({ children }: { children: React.ReactNode }) {
    if (process.env.NODE_ENV === "production") {
        notFound();
    }

    return children;
}
