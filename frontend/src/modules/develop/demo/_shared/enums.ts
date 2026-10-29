// modules/develop/demo/_shared/enums.ts
//
// U2 (docs/PLAN-fundacao-ux.md): os três módulos da demo usam `defineEnum`
// desde o início — provam o mecanismo novo antes dele chegar nos módulos
// reais. Compartilhado porque Pessoa mostra `AtendimentoSituacaoEnum` na
// própria aba de relação "Atendimentos" (mesmo motivo de `seed-data.ts`
// já ser compartilhado).
import { defineEnum } from "@core/registry/enum";
import type { PessoaStatus, AtividadeStatus, AtendimentoTipo, AtendimentoSituacao } from "./types";

export const PessoaStatusEnum = defineEnum<PessoaStatus>("PessoaStatus", {
    ATIVO: { label: "Ativo", tone: "success" },
    INATIVO: { label: "Inativo", tone: "neutral" },
});

export const AtividadeStatusEnum = defineEnum<AtividadeStatus>("AtividadeStatus", {
    ATIVA: { label: "Ativa", tone: "success" },
    INATIVA: { label: "Inativa", tone: "neutral" },
});

export const AtendimentoTipoEnum = defineEnum<AtendimentoTipo>("AtendimentoTipo", {
    SOCIAL: { label: "Social", tone: "info" },
    PSICOLOGICO: { label: "Psicológico", tone: "info" },
});

export const AtendimentoSituacaoEnum = defineEnum<AtendimentoSituacao>("AtendimentoSituacao", {
    AGENDADO: { label: "Agendado", tone: "info" },
    REALIZADO: { label: "Realizado", tone: "success" },
    CANCELADO: { label: "Cancelado", tone: "danger" },
});
