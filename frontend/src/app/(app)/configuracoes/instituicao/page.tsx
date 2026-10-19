// app/(app)/configuracoes/instituicao/page.tsx
import { SingletonDetailScreen } from "@core/screens/SingletonDetailScreen";

export default function InstituicaoSettingsPage() {
    return <SingletonDetailScreen moduleName="instituicao" recordId="current" />;
}
