import { Badge } from "@components/ui/badge";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";
import type { UserEntity } from "@modules/users/types/types";

// Só leitura — a troca de verdade acontece pelo botão Desativar/Reativar
// na toolbar (UserToolbarActions), não clicando no badge (Plano Base.md 8.2).
export function UserStatusBadge({ user }: { user: UserEntity }) {
    if (user.pendingInvite) {
        return <Badge className={STATUS_BADGE_CLASSNAME.warning}>Convite pendente</Badge>;
    }

    if (user.status === "ACTIVE") {
        return <Badge className={STATUS_BADGE_CLASSNAME.success}>Ativo</Badge>;
    }

    return <Badge className={STATUS_BADGE_CLASSNAME.neutral}>Inativo</Badge>;
}
