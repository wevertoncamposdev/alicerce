// app/(app)/tenants/[id]/page.tsx
import { DetailViewScreen } from "@/screens/DetailViewScreen";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="tenants" id={id} />;
}