// modules/roles/config/role-type-enum.ts
//
// `type` é só metadado (ADR 0007) — mesmo texto que já existia, sem uso,
// em `src/locales/pt.json` (`enum.role.*`); troca o mecanismo pro
// `defineEnum`/`EnumBadge` dominante no app (core/registry/enum.ts,
// mesmo padrão de UserStatusEnum/FeedbackStatusEnum/demo), não o
// `react-intl` isolado que só este módulo usa.
import { defineEnum } from "@core/registry/enum";
import type { RoleType } from "@modules/roles/types/types";

export const RoleTypeEnum = defineEnum<RoleType>("RoleType", {
    ADMIN: { label: "Administrador", tone: "danger" },
    USER: { label: "Usuário", tone: "info" },
    GUEST: { label: "Convidado", tone: "neutral" },
});
