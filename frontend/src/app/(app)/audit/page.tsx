// app/(app)/audit/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";

export default function AuditPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="audit" searchParams={searchParams} />;
}
