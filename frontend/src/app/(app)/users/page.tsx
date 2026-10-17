// app/(app)/users/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";

export default function UsersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="users" searchParams={searchParams} />;
}