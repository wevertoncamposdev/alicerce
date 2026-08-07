// app/(app)/favorites/page.tsx
import { TypeViewScreen } from "@/screens/TypeViewScreen";

export default function FavoritesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="favorites" searchParams={searchParams} />;
}