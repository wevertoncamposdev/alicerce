// app/(app)/feedbacks/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function FeedbackDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <DetailViewScreen moduleName="feedbacks" id={id} />;
}
