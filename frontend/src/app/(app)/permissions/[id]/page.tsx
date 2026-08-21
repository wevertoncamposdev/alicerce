// app/(app)/permissions/[id]/page.tsx
import { DetailViewScreen } from "@/screens/DetailViewScreen";

export default async function PermissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="permissions" id={id} />;
}
