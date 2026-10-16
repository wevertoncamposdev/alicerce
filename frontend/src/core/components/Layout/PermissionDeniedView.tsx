import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@components/ui/empty-state";

/**
 * Tela exibida quando o backend recusa uma requisição por falta de permissão
 * (403) — antes disso não existia tratamento nenhum: o erro propagava até o
 * error boundary do Next.js e virava um 500 genérico sem explicação.
 */
export function PermissionDeniedView({ message }: { message?: string }) {
    return (
        <div className="px-4 py-3">
            <EmptyState
                icon={ShieldAlert}
                title="Acesso negado"
                description={message ?? "Você não tem permissão para acessar este conteúdo."}
            />
        </div>
    );
}
