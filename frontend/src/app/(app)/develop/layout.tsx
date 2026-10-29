// app/(app)/develop/layout.tsx
//
// `/develop` é documentação interna/showcase do template (ADR 0005) — nunca
// deveria estar acessível num deploy de produção (F4.2, docs/Plan-Finalizacao.md).
// `notFound()` aqui cobre toda a subárvore (page.tsx, detail-showcase/** e
// demo/**). U1 (docs/PLAN-fundacao-ux.md): a demo em JSON também pode
// aparecer num deploy de preview, sem ser dev — `DEMO_MODE=true` libera
// isso sem precisar de `NODE_ENV` diferente de produção.
import { notFound } from "next/navigation";

export default function DevelopLayout({ children }: { children: React.ReactNode }) {
    const isProduction = process.env.NODE_ENV === "production";
    const demoModeEnabled = process.env.DEMO_MODE === "true";

    if (isProduction && !demoModeEnabled) {
        notFound();
    }

    return children;
}
