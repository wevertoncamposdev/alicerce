// app/(app)/favorites/[id]/page.tsx
import { DetailViewScreen } from "@/screens/DetailViewScreen";

export default async function FavoriteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="favorites" id={id} />;
}