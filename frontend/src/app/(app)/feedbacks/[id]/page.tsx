// app/(app)/feedbacks/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function FeedbackDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { id } = await params;
    return <DetailViewScreen moduleName="feedbacks" id={id} searchParams={searchParams} />;
}
