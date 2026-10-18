// app/(app)/develop/detail-showcase/page.tsx
//
// Referência de validação do motor de DetailView (docs/ui/detail-page.md §8) — não é um
// módulo de domínio navegável, só uma rota de desenvolvimento pra comparar com
// docs/ui/reference/detail-layout.png a cada commit do ADR 0004.
import "@modules/develop/showcase/contract";
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default function DetailShowcasePage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <DetailViewScreen moduleName="develop-showcase" id="showcase-1" searchParams={searchParams} />;
}
