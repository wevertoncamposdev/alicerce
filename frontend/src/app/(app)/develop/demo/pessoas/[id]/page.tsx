// app/(app)/develop/demo/pessoas/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function DemoPessoaByIdPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="demo-pessoas" id={id} />;
}
