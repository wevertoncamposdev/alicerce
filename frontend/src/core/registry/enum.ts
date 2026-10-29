// core/registry/enum.ts
//
// U2 (docs/PLAN-fundacao-ux.md, ADR 0014): `defineEnum` dá um lugar só
// pra declarar rótulo + tom de um enum de status — antes cada módulo
// duplicava seu próprio mapa label (e nenhum tinha tom). Tom usa o
// mesmo vocabulário de `statusBadgeClasses.ts` (nunca cor solta).
import type { StatusBadgeSemantic } from "@core/components/DetailView/statusBadgeClasses";

export type EnumValueConfig = {
    label: string;
    tone: StatusBadgeSemantic;
};

// `label`/`tone` recebem `string`, não `V` — um enum de 4 valores e um de
// 2 precisam compartilhar o mesmo tipo de função pra `EnumDefinition<V>`
// ser atribuível a `EnumDefinition<string>` (ex.: `EnumBadge` genérico
// recebendo qualquer `defineEnum`); `V` só aparece em `options()`, onde
// a variância de retorno não quebra essa atribuição.
export type EnumDefinition<V extends string> = {
    name: string;
    label: (value: string) => string;
    tone: (value: string) => StatusBadgeSemantic;
    options: () => Array<{ value: V; label: string }>;
};

/**
 * Valor fora do mapa (dado legado, enum ainda não atualizado aqui) não
 * pode quebrar a tela — `label` devolve o valor cru, `tone` devolve
 * "neutral", igual a um status desconhecido deveria parecer.
 */
export function defineEnum<V extends string>(
    name: string,
    map: Record<V, EnumValueConfig>,
): EnumDefinition<V> {
    return {
        name,
        label: (value) => map[value as V]?.label ?? String(value),
        tone: (value) => map[value as V]?.tone ?? "neutral",
        options: () => Object.entries<EnumValueConfig>(map).map(([value, config]) => ({
            value: value as V,
            label: config.label,
        })),
    };
}
