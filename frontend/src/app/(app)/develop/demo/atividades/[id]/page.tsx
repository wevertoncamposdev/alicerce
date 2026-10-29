// app/(app)/develop/demo/atividades/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function DemoAtividadeByIdPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="demo-atividades" id={id} />;
}
