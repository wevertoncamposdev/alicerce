// app/(app)/develop/demo/atendimentos/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";

export default function DemoAtendimentosPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="demo-atendimentos" searchParams={searchParams} />;
}
