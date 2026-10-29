// app/(app)/develop/demo/atendimentos/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function DemoAtendimentoByIdPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="demo-atendimentos" id={id} />;
}
