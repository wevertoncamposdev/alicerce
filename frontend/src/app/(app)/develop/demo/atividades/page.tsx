// app/(app)/develop/demo/atividades/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";

export default function DemoAtividadesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return <TypeViewScreen moduleName="demo-atividades" searchParams={searchParams} />;
}
