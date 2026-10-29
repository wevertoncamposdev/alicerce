import { Badge } from "@components/ui/badge";
import { STATUS_BADGE_CLASSNAME } from "@core/components/DetailView/statusBadgeClasses";
import type { EnumDefinition } from "@core/registry/enum";

// U2 (docs/PLAN-fundacao-ux.md, ADR 0014): ponto único de render pra
// qualquer badge de `defineEnum` — lista, coluna ou header de detail.
export function EnumBadge({
    enumDef,
    value,
    className,
}: {
    enumDef: EnumDefinition<string>;
    value: string;
    className?: string;
}) {
    return (
        <Badge className={`${STATUS_BADGE_CLASSNAME[enumDef.tone(value)]} ${className ?? ""}`.trim()}>
            {enumDef.label(value)}
        </Badge>
    );
}
