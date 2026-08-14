
import { DetailViewScreen } from "@/screens/DetailViewScreen";

export default async function RolesDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="roles" id={id} />;
}