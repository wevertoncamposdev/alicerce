// app/(app)/perfil/page.tsx
import { SingletonDetailScreen } from "@core/screens/SingletonDetailScreen";

export default function PerfilPage() {
    return <SingletonDetailScreen moduleName="perfil" recordId="me" />;
}
