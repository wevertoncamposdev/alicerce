// app/(app)/develop/detail-showcase/[id]/page.tsx
//
// Mesma fixture de app/(app)/develop/detail-showcase/page.tsx (showcase-1), mas por id —
// valida "Relações como links" (docs/ui/detail-page.md §3/§9): a relação "Familiares"
// aponta pra cá. Registro do módulo fica no layout.tsx (compartilhado com page.tsx).
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function DetailShowcaseByIdPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="develop-showcase" id={id} />;
}
