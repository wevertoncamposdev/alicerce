// app/(app)/feedbacks/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";

export default function FeedbacksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TypeViewScreen moduleName="feedbacks" searchParams={searchParams} />;
}
