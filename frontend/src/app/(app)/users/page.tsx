// app/(app)/users/page.tsx
import { TypeViewScreen } from "@/screens/TypeViewScreen";

export default function UsersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="users" searchParams={searchParams} />;
}