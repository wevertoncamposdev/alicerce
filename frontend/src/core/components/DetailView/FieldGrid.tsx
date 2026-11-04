// core/components/DetailView/FieldGrid.tsx
//
// U4 (docs/PLAN-fundacao-ux.md): "rótulo em cima, campos lado a lado
// quando couber (span: 1|2|3 por campo)" — grid compartilhado por
// leitura (`FieldList.tsx`) e edição (`InlineFieldsGrid`, `FormView.tsx`),
// pra "campo somente leitura com o mesmo visual do editável" valer de
// verdade: as duas telas chamam o MESMO componente de layout, só muda
// o que cada `field` renderiza como valor (input vs texto).
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@components/ui/label";
import type { FormFieldConfig } from "@core/registry/types";

// Tailwind precisa da classe inteira literal no fonte (JIT não resolve
// `sm:col-span-${n}` interpolado) — por isso o mapa em vez de template.
const SPAN_CLASS: Record<1 | 2 | 3, string> = {
    1: "sm:col-span-1",
    2: "sm:col-span-2",
    3: "sm:col-span-3",
};

function fieldSpan<T>(field: FormFieldConfig<T>): 1 | 2 | 3 {
    if (field.span) return field.span;
    // Sem `span` declarado: textarea assume a linha inteira (comportamento
    // que o grid label-à-esquerda antigo já tinha, não força todo módulo
    // a declarar isso de novo); os demais tipos, 1 coluna.
    return field.type === "textarea" ? 3 : 1;
}

export function FieldGrid<T>({
    fields,
    renderValue,
    saving,
    errors,
}: {
    fields: FormFieldConfig<T>[];
    renderValue: (field: FormFieldConfig<T>) => React.ReactNode;
    /** Indicador de "salvando" ao lado do label — só a seção editável usa. */
    saving?: boolean;
    errors?: Record<string, string>;
}) {
    return (
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3 items-start">
            {fields.map((field) => {
                const error = errors?.[field.name];
                return (
                    <div key={field.name} className={`space-y-1 ${SPAN_CLASS[fieldSpan(field)]}`}>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Label htmlFor={field.name}>{field.label}</Label>
                            {saving ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : null}
                        </div>
                        {renderValue(field)}
                        {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
                        {error ? <p className="text-xs text-destructive">{error}</p> : null}
                    </div>
                );
            })}
        </div>
    );
}
