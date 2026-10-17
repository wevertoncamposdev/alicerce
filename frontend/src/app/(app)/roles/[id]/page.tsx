// app/(app)/roles/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="roles" id={id} />;
}