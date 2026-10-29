// modules/feedbacks/config/status-enum.ts
//
// U2 (docs/PLAN-fundacao-ux.md): label e tom do status num lugar só —
// antes `FeedbackStatusControl.tsx` e `components/columns.ts` duplicavam
// o mesmo mapa RECEIVED/IN_REVIEW/... cada um com o seu.
import { defineEnum } from "@core/registry/enum";
import type { FeedbackStatus } from "@modules/feedbacks/types/types";

export const FeedbackStatusEnum = defineEnum<FeedbackStatus>("FeedbackStatus", {
    RECEIVED: { label: "Recebido", tone: "neutral" },
    IN_REVIEW: { label: "Em análise", tone: "info" },
    PLANNED: { label: "Planejado", tone: "warning" },
    DONE: { label: "Concluído", tone: "success" },
    DECLINED: { label: "Recusado", tone: "danger" },
});
