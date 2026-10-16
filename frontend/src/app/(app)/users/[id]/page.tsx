// app/(app)/users/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="users" id={id} />;
}