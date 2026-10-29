import { Badge } from "@components/ui/badge";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";
import { defineEnum } from "@core/registry/enum";
import { EnumBadge } from "@core/components/DetailView/EnumBadge";
import type { UserEntity } from "@modules/users/types/types";

// U2 (docs/PLAN-fundacao-ux.md): os 4 valores do enum `Status` do Prisma
// (`backend/prisma/schema.prisma`, compartilhado por User/Role/Tenant) —
// `UserEntity.status` é `string` solto no frontend, mas só estes 4
// valores saem do backend.
export const UserStatusEnum = defineEnum("UserStatus", {
    ACTIVE: { label: "Ativo", tone: "success" },
    INACTIVE: { label: "Inativo", tone: "neutral" },
    SUSPENDED: { label: "Suspenso", tone: "warning" },
    ARCHIVED: { label: "Arquivado", tone: "danger" },
});

// Só leitura — a troca de verdade acontece pelo botão Desativar/Reativar
// na toolbar (UserToolbarActions), não clicando no badge (Plano Base.md 8.2).
export function UserStatusBadge({ user }: { user: UserEntity }) {
    if (user.pendingInvite) {
        return <Badge className={STATUS_BADGE_CLASSNAME.warning}>Convite pendente</Badge>;
    }

    return <EnumBadge enumDef={UserStatusEnum} value={user.status} />;
}
