// app/(app)/develop/demo/pessoas/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";

export default function DemoPessoasPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="demo-pessoas" searchParams={searchParams} />;
}
