// app/(app)/tenants/page.tsx
import { TypeViewScreen } from "@/screens/TypeViewScreen";

export default function TenantPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="tenants" searchParams={searchParams} />;
}