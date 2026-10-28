// app/(app)/audit/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function AuditDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <DetailViewScreen moduleName="audit" id={id} />;
}
